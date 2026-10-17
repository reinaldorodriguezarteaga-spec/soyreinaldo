import { describe, expect, it } from "vitest";
import { perfilAlDia } from "../perfil-al-dia";
import type { Fixture, TeamSeasonStats } from "../api-football";

const BARCA = 529;
let n = 0;
function partido(fecha: string, local: number, gl: number, gv: number, liga = 140): Fixture {
  return {
    fixture: { id: ++n, date: fecha, status: { short: "FT" } },
    league: { id: liga },
    teams: { home: { id: local }, away: { id: local === BARCA ? 1 : BARCA } },
    goals: { home: gl, away: gv },
  } as unknown as Fixture;
}

const c = (total: number) => ({ home: 0, away: 0, total });
const stats = {
  league: { id: 140, season: 2026 },
  form: "WW",
  fixtures: { played: c(2), wins: c(2), draws: c(0), loses: c(0) },
  goals: {
    for: { total: c(5), minute: { "0-15": { total: 5, percentage: null } } },
    against: { total: c(1), minute: {} },
  },
  biggest: { streak: { wins: 2, draws: 0, loses: 0 } },
  clean_sheet: c(1),
  failed_to_score: c(0),
} as unknown as TeamSeasonStats;

describe("perfilAlDia", () => {
  const temporada = [
    partido("2026-08-20T19:00:00Z", BARCA, 3, 0),
    partido("2026-08-27T19:00:00Z", 1, 1, 2),
  ];

  it("con la API al día, recalcula la racha (la de la API venía mal)", () => {
    const vedv = [
      partido("2026-08-20T19:00:00Z", BARCA, 1, 0),
      partido("2026-08-27T19:00:00Z", BARCA, 1, 1),
    ];
    const r = perfilAlDia({ ...stats, biggest: { ...stats.biggest, streak: { wins: 0, draws: 0, loses: 0 } } }, vedv, BARCA);
    expect(r.minutosHasta).toBeNull();
    expect(r.stats.biggest.streak.wins).toBe(1);
    expect(r.stats.fixtures.played.total).toBe(2);
  });

  it("si nos faltan partidos (lista recortada), manda la API", () => {
    expect(perfilAlDia(stats, temporada.slice(1), BARCA)).toEqual({ stats, minutosHasta: null });
  });

  it("suma el partido que la API aún no tiene, sin la temporada anterior", () => {
    const anterior = partido("2026-05-20T19:00:00Z", BARCA, 0, 4);
    const nuevo = partido("2026-09-03T19:00:00Z", 1, 2, 2);
    const r = perfilAlDia(stats, [anterior, ...temporada, nuevo, partido("2026-09-01T19:00:00Z", BARCA, 9, 0, 2)], BARCA);
    expect(r.minutosHasta).toBe(2);
    expect(r.stats.fixtures.played.total).toBe(3);
    expect(r.stats.fixtures.draws.total).toBe(1);
    expect(r.stats.goals.for.total.total).toBe(7);
    expect(r.stats.goals.against.total.total).toBe(3);
    expect(r.stats.form).toBe("WWD");
    expect(r.stats.goals.for.minute).toBe(stats.goals.for.minute);
  });

  it("si la diferencia no cuadra (más de dos), manda la API", () => {
    const muchos = [1, 2, 3].map((i) => partido(`2026-09-0${i}T19:00:00Z`, BARCA, 1, 0));
    expect(perfilAlDia(stats, [...temporada, ...muchos], BARCA).minutosHasta).toBeNull();
  });
});
