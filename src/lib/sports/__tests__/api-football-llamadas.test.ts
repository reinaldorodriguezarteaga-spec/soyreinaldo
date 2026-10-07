import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sin caché de Next en las pruebas: cada llamada llega a `fetch`.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

// Archivo permanente en memoria (en producción, la tabla apif_archivo).
const archivo = new Map<string, { respuesta: unknown; final: boolean }>();
vi.mock("../archivo", async (original) => {
  const real = await original<typeof import("../archivo")>();
  return {
    respuestaUtil: real.respuestaUtil,
    leerArchivo: async (url: string) => archivo.get(url) ?? null,
    guardarArchivo: async (url: string, respuesta: unknown, final: boolean) => {
      if (real.respuestaUtil(respuesta)) archivo.set(url, { respuesta, final });
    },
  };
});

const {
  getFixtureById,
  getFixturesEvents,
  getTeamCoach,
  getTeamStatistics,
  getTeamFixtures,
  enModoAhorro,
  cuotaAgotada,
  _fijarRestanteParaPruebas,
} = await import("../api-football");

function respuesta(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("llamadas a API-Football", () => {
  beforeEach(() => {
    process.env.API_FOOTBALL_KEY = "test";
    _fijarRestanteParaPruebas(null);
    archivo.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dos peticiones simultáneas a la misma URL hacen UNA sola llamada", async () => {
    const fetchMock = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return respuesta({ errors: [], response: [{ fixture: { id: 7 } }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const [a, b, c] = await Promise.all([
      getFixtureById(7, 45),
      getFixtureById(7, 60),
      getFixtureById(7, 45),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a?.fixture.id).toBe(7);
    expect(b?.fixture.id).toBe(7);
    expect(c?.fixture.id).toBe(7);
  });

  it("una vez terminada, la siguiente petición sí vuelve a llamar", async () => {
    const fetchMock = vi.fn(async () =>
      respuesta({ errors: [], response: [{ fixture: { id: 8 } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getFixtureById(8, 45);
    await getFixtureById(8, 45);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cada llamada lleva tiempo máximo, y una fallida no bloquea a la siguiente", async () => {
    let primera = true;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      if (primera) {
        primera = false;
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      }
      return respuesta({ errors: [], response: [{ fixture: { id: 9 } }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    // La primera se corta (get() lo convierte en "sin datos"); la segunda ya
    // no espera a la colgada: vuelve a llamar y trae el partido.
    expect(await getFixtureById(9, 45)).toBeNull();
    expect((await getFixtureById(9, 45))?.fixture.id).toBe(9);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("getFixturesEvents saca goles y tarjetas de varios partidos en una llamada", async () => {
    const ev = (type: string, detail: string, minute: number, player: string) => ({
      time: { elapsed: minute, extra: null },
      team: { id: 1, name: "A", logo: "" },
      player: { id: 1, name: player },
      assist: { id: null, name: null },
      type,
      detail,
    });
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("ids=1-2");
      return respuesta({
        errors: [],
        response: [
          {
            fixture: { id: 1 },
            events: [
              ev("Goal", "Normal Goal", 30, "Delantero"),
              ev("Goal", "Missed Penalty", 40, "Fallón"),
              ev("Card", "Red Card", 50, "Central"),
              ev("subst", "Substitution 1", 60, "Cambio"),
            ],
          },
          { fixture: { id: 2 }, events: [] },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const mapa = await getFixturesEvents([2, 1, 1], 600);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mapa.get(1)?.goals.map((g) => g.player)).toEqual(["Delantero"]);
    expect(mapa.get(1)?.cards).toEqual([
      expect.objectContaining({ player: "Central", expulsion: true }),
    ]);
    expect(mapa.get(2)).toEqual({ goals: [], cards: [] });
  });

  it("modo ahorro: con poca cuota, lo secundario no llama y lo esencial sí", async () => {
    const fetchMock = vi.fn(async () =>
      respuesta({ errors: [], response: [{ fixture: { id: 11 } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    _fijarRestanteParaPruebas(5_000);
    expect(enModoAhorro()).toBe(true);

    expect(await getTeamCoach(1234)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    expect((await getFixtureById(11, 45))?.fixture.id).toBe(11);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("con cuota de sobra, lo secundario se pide normal", async () => {
    const fetchMock = vi.fn(async () => respuesta({ errors: [], response: [] }));
    vi.stubGlobal("fetch", fetchMock);
    _fijarRestanteParaPruebas(60_000);
    expect(enModoAhorro()).toBe(false);
    await getTeamCoach(5678);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("si la API dice que la cuota del día se acabó, entra en ahorro", async () => {
    const fetchMock = vi.fn(async () =>
      respuesta({
        errors: { requests: "You have reached the request limit for the day" },
        response: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(enModoAhorro()).toBe(false);
    expect(await getFixtureById(12, 45)).toBeNull();
    expect(enModoAhorro()).toBe(true);
    expect(cuotaAgotada()).toBe(true);
  });

  it("en modo ahorro, el núcleo de las fichas (partidos de un equipo) se sigue pidiendo", async () => {
    const fetchMock = vi.fn(async () => respuesta({ errors: [], response: [] }));
    vi.stubGlobal("fetch", fetchMock);
    _fijarRestanteParaPruebas(5_000);
    expect(cuotaAgotada()).toBe(false);
    await getTeamFixtures(4321, { last: 40, next: 40 });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("archivo: un partido terminado hace horas se guarda y no se vuelve a pedir", async () => {
    const terminado = {
      fixture: { id: 21, date: new Date(Date.now() - 24 * 3_600_000).toISOString(), status: { short: "FT" } },
    };
    const fetchMock = vi.fn(async () => respuesta({ errors: [], response: [terminado] }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await getFixtureById(21, 45))?.fixture.id).toBe(21);
    expect((await getFixtureById(21, 45))?.fixture.id).toBe(21);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("archivo: un partido EN JUEGO no se guarda nunca (nada de marcadores congelados)", async () => {
    const enJuego = {
      fixture: { id: 22, date: new Date().toISOString(), status: { short: "2H" } },
    };
    vi.stubGlobal("fetch", vi.fn(async () => respuesta({ errors: [], response: [enJuego] })));
    await getFixtureById(22, 45);
    expect(archivo.size).toBe(0);
  });

  it("archivo: si la API falla, sirve lo último bueno", async () => {
    const stats = { team: { id: 9 }, games: { played: 10 } };
    vi.stubGlobal("fetch", vi.fn(async () => respuesta({ errors: [], response: stats })));
    // /teams/statistics devuelve un objeto; get() lo guarda tal cual en response
    await getTeamStatistics(9, { league: 140, season: 2026 });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respuesta({ errors: { requests: "limit for the day" }, response: [] })),
    );
    const otra = await getTeamStatistics(9, { league: 140, season: 2026 });
    expect(otra).toEqual(stats);
  });
});
