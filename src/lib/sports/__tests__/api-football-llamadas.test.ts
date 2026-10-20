import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sin caché de Next en las pruebas: cada llamada llega a `fetch`.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

// Archivo permanente en memoria (en producción, la tabla apif_archivo).
const archivo = new Map<string, { respuesta: unknown; final: boolean; actualizado?: number }>();
vi.mock("../archivo", async (original) => {
  const real = await original<typeof import("../archivo")>();
  return {
    respuestaUtil: real.respuestaUtil,
    leerArchivo: async (url: string) => archivo.get(url) ?? null,
    guardarArchivo: async (url: string, respuesta: unknown, final: boolean) => {
      if (real.respuestaUtil(respuesta)) archivo.set(url, { respuesta, final, actualizado: Date.now() });
    },
  };
});

const {
  getPartidosEnJuego,
  getPartidosPorIdsEnVivo,
  getFixtureById,
  getFixturePlayers,
  getFixturePlayersTodos,
  getFixturesEvents,
  getTeamCoach,
  getTeamStatistics,
  getTeamFixtures,
  getPlayerSeasonStats,
  getFixtureGoals,
  getFixtureCards,
  getFixtureSubs,
  refrescarEquipoTrasPartido,
  enModoAhorro,
  cuotaAgotada,
  frenoActivo,
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
    vi.useRealTimers();
  });

  it("incluye suplentes sin nota usando la misma URL y una sola llamada", async () => {
    const jugador = (id: number, rating: string | null) => ({
      player: { id, name: `Jugador ${id}`, photo: null },
      statistics: [{ games: { rating, minutes: 5 }, goals: { total: 1 }, shots: {}, passes: {}, tackles: {}, duels: {}, dribbles: {}, fouls: {}, cards: {} }],
    });
    const fetchMock = vi.fn(async (_url: string | URL) => respuesta({
      errors: [],
      response: [{ team: { id: 1, name: "Equipo", logo: "" }, players: [jugador(1, null), jugador(2, "7.5"), jugador(3, "8")] }],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const [todos, conNota] = await Promise.all([getFixturePlayersTodos(98765, 600), getFixturePlayers(98765, 600)]);
    expect(todos[0].players.map((p) => p.id)).toEqual([3, 2, 1]);
    expect(todos[0].players[2]).toMatchObject({ rating: null, goals: 1 });
    expect(conNota[0].players).toEqual(todos[0].players.slice(0, 2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname + url.search).toBe("/fixtures/players?fixture=98765");
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
    // A última hora: con 5.000 restantes el ritmo del día es normal (sin freno).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T23:30:00Z"));
    const fetchMock = vi.fn(async () => respuesta({ errors: [], response: [] }));
    vi.stubGlobal("fetch", fetchMock);
    _fijarRestanteParaPruebas(5_000);
    expect(frenoActivo()).toBe(false);
    expect(cuotaAgotada()).toBe(false);
    await getTeamFixtures(4321, { last: 40, next: 40 });
    expect(fetchMock).toHaveBeenCalled();
  });

  it.each([false, true])("no pide los listados desactivados (forceLive=%s)", async (forceLive) => {
    const fetchMock = vi.fn(async (_url: string | URL) => respuesta({ errors: [], response: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await getTeamFixtures(7654, { last: 0, next: 4, forceLive });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("next=4");
    fetchMock.mockClear();
    await getTeamFixtures(7655, { last: 1, next: 0, forceLive });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("last=1");
    fetchMock.mockClear();
    expect(await getTeamFixtures(7656, { last: 0, next: 0, forceLive })).toEqual({ team: null, recent: [], upcoming: [] });
    expect(fetchMock).not.toHaveBeenCalled();
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

  describe("freno por ritmo", () => {
    const a = (hora: string) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(`2026-10-13T${hora}:00Z`));
    };

    it("un día normal no frena; una ráfaga de madrugada sí", () => {
      a("06:43");
      _fijarRestanteParaPruebas(75_000 - 8_000); // gasto normal a esa hora
      expect(frenoActivo()).toBe(false);
      _fijarRestanteParaPruebas(75_000 - 52_757); // el 13-oct a las 06:43
      expect(frenoActivo()).toBe(true);
    });

    it("al final del día la curva llega a la cuota entera menos nada", () => {
      a("20:00");
      _fijarRestanteParaPruebas(75_000 - 60_000); // permitido a las 20:00: 65.000
      expect(frenoActivo()).toBe(false);
    });

    it("un dato de cuota viejo (más de 15 min) no frena", () => {
      a("06:43");
      _fijarRestanteParaPruebas(10_000, 20 * 60_000);
      expect(frenoActivo()).toBe(false);
    });

    it("frenado: la ficha sirve lo guardado y no llama; el partido sí llama", async () => {
      a("06:43");
      const coach = [{ id: 1, name: "Flick" }];
      const fetchMock = vi.fn(async () => respuesta({ errors: [], response: coach }));
      vi.stubGlobal("fetch", fetchMock);
      _fijarRestanteParaPruebas(60_000);
      await getTeamCoach(529); // se guarda en el archivo
      expect(fetchMock).toHaveBeenCalledTimes(1);

      _fijarRestanteParaPruebas(20_000); // 55.000 gastadas a las 06:43 → freno
      expect(frenoActivo()).toBe(true);
      expect(await getTeamFixtures(529, { last: 5, next: 5 })).toBeTruthy();
      expect(fetchMock).toHaveBeenCalledTimes(1); // ninguna llamada nueva

      fetchMock.mockImplementation(async () =>
        respuesta({ errors: [], response: [{ fixture: { id: 31 } }] }),
      );
      expect((await getFixtureById(31, 45))?.fixture.id).toBe(31);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("base de datos primero", () => {
    it("una ficha guardada hace poco se sirve sin llamar; si es vieja, se refresca", async () => {
      const coach = [{ id: 2, name: "Ancelotti" }];
      const fetchMock = vi.fn(async () => respuesta({ errors: [], response: coach }));
      vi.stubGlobal("fetch", fetchMock);

      await getTeamCoach(541);
      await getTeamCoach(541);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Guardado hace 4 días (el entrenador vale 3): se vuelve a pedir.
      for (const [url, fila] of archivo) archivo.set(url, { ...fila, actualizado: Date.now() - 4 * 86_400_000 });
      await getTeamCoach(541);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("el partido en juego nunca sale del archivo", async () => {
      const enJuego = { fixture: { id: 41, date: new Date().toISOString(), status: { short: "1H" } } };
      const fetchMock = vi.fn(async () => respuesta({ errors: [], response: [enJuego] }));
      vi.stubGlobal("fetch", fetchMock);
      await getFixtureById(41, 45);
      await getFixtureById(41, 45);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("cabecera de cuota falsa (74.999)", () => {
    const llamarCon = async (remaining: string) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(JSON.stringify({ errors: [], response: [{ fixture: { id: 51 } }] }), {
            status: 200,
            headers: { "x-ratelimit-requests-remaining": remaining },
          }),
        ),
      );
      await getFixtureById(51, 45);
    };

    it("un valor que sube dentro del día se descarta: el freno sigue puesto", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-13T06:43:00Z"));
      await llamarCon("20000");
      expect(frenoActivo()).toBe(true);
      await llamarCon("74999");
      expect(frenoActivo()).toBe(true);
    });

    it("una instancia nueva no se cree el 74.999 a media mañana", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-13T06:43:00Z"));
      await llamarCon("74999");
      await llamarCon("20000");
      expect(frenoActivo()).toBe(true);
    });

    it("al empezar el día nuevo sí se acepta que vuelva a subir", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-13T23:50:00Z"));
      await llamarCon("3000");
      vi.setSystemTime(new Date("2026-10-14T00:05:00Z"));
      await llamarCon("74990");
      expect(frenoActivo()).toBe(false);
      expect(enModoAhorro()).toBe(false);
    });
  });

  describe("refresco tras un partido", () => {
    it("guarda a cada jugador donde lo busca su ficha, y la ficha ya no llama", async () => {
      const laliga = { slug: "laliga", leagueId: 140, season: 2026, name: "LaLiga" } as never;
      const jugador = (id: number) => ({
        player: { id, name: `J${id}` },
        statistics: [{ team: { id: 529, name: "Barcelona", logo: "" }, games: { appearences: 8 }, goals: {} }],
      });
      const urls: string[] = [];
      const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const u = new URL(String(input));
        urls.push(u.pathname + u.search);
        if (u.pathname === "/players") {
          const page = Number(u.searchParams.get("page"));
          return respuesta({
            errors: [],
            paging: { current: page, total: 2 },
            response: page === 1 ? [jugador(1), jugador(2)] : [jugador(3)],
          });
        }
        return respuesta({ errors: [], response: [{ fixture: { id: 1 } }] });
      });
      vi.stubGlobal("fetch", fetchMock);

      const llamadas = await refrescarEquipoTrasPartido(529, laliga);
      expect(llamadas).toBe(5); // 2 de partidos + 1 de estadísticas + 2 páginas
      expect(urls.filter((u) => u.startsWith("/players")).length).toBe(2);

      fetchMock.mockClear();
      const p = await getPlayerSeasonStats(3, laliga);
      expect(p?.appearances).toBe(8);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("goles, tarjetas y cambios salen de UNA sola llamada de eventos", async () => {
    const eventos = [
      { type: "Goal", detail: "Normal Goal", time: { elapsed: 10 }, team: { id: 1 }, player: { name: "A" }, assist: {} },
      { type: "Card", detail: "Yellow Card", time: { elapsed: 20 }, team: { id: 2 }, player: { name: "B" }, assist: {} },
      { type: "subst", detail: "Substitution 1", time: { elapsed: 60 }, team: { id: 1 }, player: { name: "C" }, assist: { name: "D" } },
    ];
    const fetchMock = vi.fn(async () => respuesta({ errors: [], response: eventos }));
    vi.stubGlobal("fetch", fetchMock);
    const [g, c, s] = await Promise.all([getFixtureGoals(61, 20), getFixtureCards(61, 20), getFixtureSubs(61, 20)]);
    expect(g).toHaveLength(1);
    expect(c).toHaveLength(1);
    expect(s.inKeys).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("directo con presupuesto", () => {
  beforeEach(() => { process.env.API_FOOTBALL_KEY = "test"; });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("no reintenta un rate limit y transmite la cancelación al fetch", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return new Response("{}", { status: 429 });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await getPartidosEnJuego(AbortSignal.timeout(6_000))).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("no inicia una llamada con presupuesto agotado", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await getPartidosEnJuego(AbortSignal.abort())).toBeNull();
    expect(await getPartidosPorIdsEnVivo([1], AbortSignal.abort())).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("consulta los desaparecidos en un solo lote de hasta veinte", async () => {
    const fetchMock = vi.fn(async (_url: string) => respuesta({ errors: [], response: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await getPartidosPorIdsEnVivo(Array.from({ length: 25 }, (_, i) => i + 1), AbortSignal.timeout(6_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("ids")?.split("-")).toHaveLength(20);
  });
});
