import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
const datos = vi.hoisted(() => ({ calendario: null as unknown, directo: null as Map<number, unknown> | null }));
vi.mock("../sports-cache", async (original) => ({
  ...await original<typeof import("../sports-cache")>(),
  readCache: async (key: string) => key.startsWith("upcoming:") ? null : datos.calendario,
}));
vi.mock("../directo", async (original) => ({
  ...await original<typeof import("../directo")>(),
  filasDirectoVigentes: async () => datos.directo,
  filasDirecto: async () => datos.directo ?? new Map(),
}));
vi.mock("../archivo", async (original) => ({
  ...await original<typeof import("../archivo")>(),
  leerArchivo: async () => null,
  guardarArchivo: async () => {},
}));
import { getCompetitionFixturesWindow, getCompetitionUpcomingFixtures, _fijarRestanteParaPruebas, type Fixture } from "../api-football";
import { COMPETITIONS_BY_SLUG } from "../competitions";

const c = COMPETITIONS_BY_SLUG.laliga;
function fixture(id: number, short: "NS" | "FT" | "2H", hours: number, league = c.leagueId): Fixture {
  return {
    fixture: { id, date: new Date(Date.now() + hours * 3_600_000).toISOString(), status: { short, long: "", elapsed: null }, venue: { name: null, city: null } },
    league: { id: league, name: "LaLiga", logo: "", round: "Regular Season" },
    teams: { home: { id: 1, name: "A", logo: "", winner: null }, away: { id: 2, name: "B", logo: "", winner: null } },
    goals: { home: 0, away: 0 },
  };
}
const fetchMock = vi.fn();
beforeEach(() => {
  process.env.API_FOOTBALL_KEY = "test";
  datos.calendario = null;
  datos.directo = null;
  _fijarRestanteParaPruebas(null);
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ errors: [], response: [] })));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("ventana de partidos desde el cron", () => {
  it("usa calendario y cron vigente, con goles/minuto nuevos y sin API", async () => {
    const pendiente = fixture(1, "NS", -1);
    const vivo = { ...fixture(1, "2H", -1), goals: { home: 2, away: 1 } };
    datos.calendario = [pendiente, fixture(2, "NS", 24)];
    datos.directo = new Map<number, unknown>([[1, vivo]]);
    const result = await getCompetitionFixturesWindow(c);
    expect(result).toHaveLength(1);
    expect(result[0].fixture.status.short).toBe("2H");
    expect(result[0].goals).toEqual({ home: 2, away: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("un cron vigente sin partidos también evita consultar la API", async () => {
    datos.calendario = [fixture(2, "NS", 3)];
    datos.directo = new Map();
    expect(await getCompetitionFixturesWindow(c)).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("añade partidos recién acabados que falten, sin eventos crudos ni otras ligas", async () => {
    datos.calendario = [fixture(2, "NS", 3)];
    datos.directo = new Map<number, unknown>([
      [3, { ...fixture(3, "FT", -1), events: [{ detalle: "evento" }] }],
      [4, fixture(4, "2H", -1, 999)],
    ]);
    const result = await getCompetitionFixturesWindow(c);
    expect(result.map((f) => f.fixture.id)).toEqual([2, 3]);
    expect(result[1]).not.toHaveProperty("events");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["cron caído", "calendario ausente", "estado ambiguo"])("con %s conserva el respaldo de API", async (caso) => {
    datos.calendario = caso === "calendario ausente" ? null : [fixture(2, caso === "estado ambiguo" ? "2H" : "NS", 1)];
    datos.directo = caso === "cron caído" ? null : new Map();
    await getCompetitionFixturesWindow(c);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

it("no consulta próximos partidos de una edición ya terminada", async () => {
  datos.calendario = [fixture(9, "FT", -2)];
  expect(await getCompetitionUpcomingFixtures(c, 6)).toEqual([]);
  expect(fetchMock).not.toHaveBeenCalled();
});
