import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sin caché de Next en las pruebas: cada llamada llega a `fetch`.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

const { getFixtureById, getFixturesEvents, getTeamCoach, enModoAhorro, _fijarRestanteParaPruebas } =
  await import("../api-football");

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
  });
});
