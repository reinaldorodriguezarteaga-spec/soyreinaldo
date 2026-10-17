import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("../api-football", async (original) => ({
  ...await original<typeof import("../api-football")>(),
  getCompetitionUpcomingFixtures: vi.fn(),
  getExtraLeagueUpcoming: vi.fn(),
  getTeamFixtures: vi.fn(),
  getCompetitionFixturesWindow: vi.fn(),
  getCompetitionFinishedFixtures: vi.fn(),
  getFixturesEvents: vi.fn(),
}));
import { getCompetitionUpcomingFixtures, getExtraLeagueUpcoming, getTeamFixtures, getCompetitionFixturesWindow, getCompetitionFinishedFixtures, getFixturesEvents, type Fixture } from "../api-football";
import { COMPETITIONS_BY_SLUG } from "../competitions";
import { getHomeWidgetData, getUpcomingCalendar } from "../widget-data";

const fixture = (id: number, name = "LaLiga"): Fixture => ({
  fixture: { id, date: "2026-10-18T18:00:00Z", status: { short: "NS", long: "", elapsed: null }, venue: { name: null, city: null } },
  league: { id: 140, name, logo: "", round: "Regular Season" },
  teams: { home: { id: 1, name: "A", logo: "", winner: null }, away: { id: 2, name: "B", logo: "", winner: null } },
  goals: { home: null, away: null },
});

beforeEach(() => {
  vi.mocked(getCompetitionFixturesWindow).mockReset().mockResolvedValue([]);
  vi.mocked(getCompetitionFinishedFixtures).mockReset().mockResolvedValue([]);
  vi.mocked(getFixturesEvents).mockReset().mockResolvedValue(new Map());
  vi.mocked(getCompetitionUpcomingFixtures).mockReset().mockResolvedValue([]);
  vi.mocked(getExtraLeagueUpcoming).mockReset().mockResolvedValue([]);
  vi.mocked(getTeamFixtures).mockReset().mockResolvedValue({ team: null, recent: [], upcoming: [] });
});

describe("carga del calendario", () => {
  it("inicia las fuentes independientes sin esperar a la competición lenta", async () => {
    let resolve!: (value: Fixture[]) => void;
    vi.mocked(getCompetitionUpcomingFixtures).mockReturnValue(new Promise((r) => { resolve = r; }));
    const result = getUpcomingCalendar([COMPETITIONS_BY_SLUG.laliga], [{ id: 529, name: "Barcelona", homeCompetitionSlug: "laliga" }], [{ id: 541, linkSlug: "laliga" }]);
    expect(getExtraLeagueUpcoming).toHaveBeenCalled();
    expect(getTeamFixtures).toHaveBeenCalledWith(529, { last: 0, next: 4 });
    expect(getTeamFixtures).toHaveBeenCalledWith(541, { last: 0, next: 4 });
    resolve([]);
    expect(await result).toEqual([]);
  });

  it("mantiene la prioridad de competición y los favoritos al deduplicar", async () => {
    vi.mocked(getCompetitionUpcomingFixtures).mockResolvedValue([fixture(1)]);
    vi.mocked(getTeamFixtures).mockResolvedValue({ team: null, recent: [], upcoming: [fixture(1, "Otro nombre"), fixture(2)] });
    const days = await getUpcomingCalendar([COMPETITIONS_BY_SLUG.laliga], [{ id: 529, name: "Barcelona", homeCompetitionSlug: "laliga" }], [{ id: 529, linkSlug: "laliga" }]);
    expect(days[0].dateKey).toBe("favoritos");
    const normales = days.slice(1).flatMap((d) => d.fixtures);
    expect(normales.map((f) => f.fixture.id)).toEqual([1, 2]);
    expect(normales[0].competitionLabel).toBe(COMPETITIONS_BY_SLUG.laliga.name);
  });
});

it("muestra el final recién recibido del directo antes del refresco del calendario", async () => {
  const final = fixture(7);
  final.fixture.date = new Date().toISOString();
  final.fixture.status.short = "FT";
  final.goals = { home: 2, away: 1 };
  vi.mocked(getCompetitionFixturesWindow).mockResolvedValue([final]);
  const result = await getHomeWidgetData([COMPETITIONS_BY_SLUG.laliga]);
  expect(result.groups[0].live).toEqual([]);
  expect(result.groups[0].finishedToday[0].goals).toEqual({ home: 2, away: 1 });
  expect(getFixturesEvents).not.toHaveBeenCalled();
});
