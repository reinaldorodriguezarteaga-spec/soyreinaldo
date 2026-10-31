import { describe, expect, it } from "vitest";
import type { Fixture, FixtureGoal, PlayerStatLeader } from "../api-football";
import { goleadoresAlDia, partidosPendientes } from "../goleadores-al-dia";

const BARCA = 529;
const ALAVES = 542;
const AHORA = Date.parse("2026-11-01T00:00:00Z");

function jugador(id: number, nombre: string, goles: number, partidos: number, asist = 0): PlayerStatLeader {
  return {
    player: { id, name: nombre, photo: "", nationality: null },
    statistics: [
      {
        team: { id: BARCA, name: "Barcelona", logo: "" },
        goals: { total: goles, assists: asist },
        games: { appearences: partidos, minutes: null, rating: null },
      },
    ],
  };
}

function partido(id: number, fecha: string, estado = "FT"): Fixture {
  return {
    fixture: { id, date: fecha, status: { short: estado, elapsed: 90 } },
    teams: { home: { id: BARCA }, away: { id: ALAVES } },
    goals: { home: 3, away: 0 },
  } as unknown as Fixture;
}

const gol = (playerId: number, assistId: number | null = null, detail = "Normal Goal"): FixtureGoal => ({
  minute: 10,
  teamId: BARCA,
  player: "x",
  detail,
  assist: null,
  playerId,
  assistId,
});

describe("goleadores al día", () => {
  // 10 partidos ya sumados por el API (Lamine los jugó todos) y el 11.º, de anoche.
  const jugados = Array.from({ length: 10 }, (_, i) =>
    partido(i + 1, new Date(AHORA - (40 - i * 3) * 86_400_000).toISOString()),
  );
  const anoche = partido(11, "2026-10-31T20:00:00Z");
  const scorers = [jugador(1, "Raphinha", 13, 9), jugador(2, "Lamine Yamal", 8, 10)];

  it("solo queda pendiente el partido que el ranking aún no cuenta", () => {
    const p = partidosPendientes([scorers], [...jugados, anoche], AHORA);
    expect(p.map((f) => f.fixture.id)).toEqual([11]);
  });

  it("no mira partidos de hace más de dos días aunque falten", () => {
    const p = partidosPendientes([[jugador(1, "Raphinha", 13, 8)]], [...jugados, anoche], AHORA);
    expect(p.map((f) => f.fixture.id)).toEqual([11]);
  });

  it("los partidos sin empezar no cuentan", () => {
    const p = partidosPendientes([scorers], [...jugados, partido(12, "2026-10-31T22:00:00Z", "NS")], AHORA);
    expect(p).toEqual([]);
  });

  it("suma goles y asistencias, sin autogoles, y reordena", () => {
    const r = goleadoresAlDia(scorers, [jugador(2, "Lamine Yamal", 8, 10, 6)], [
      { fx: anoche, goals: [gol(2), gol(2, 1), gol(1, 2), gol(1, null, "Own Goal")] },
    ]);
    expect(r.adelantado).toBe(true);
    expect(r.scorers.map((p) => [p.player.name, p.statistics[0].goals.total, p.statistics[0].games.appearences])).toEqual([
      ["Raphinha", 14, 10],
      ["Lamine Yamal", 10, 11],
    ]);
    expect(r.assists[0].statistics[0].goals.assists).toBe(7);
  });

  it("sin goles nuevos de los del ranking, todo igual", () => {
    const r = goleadoresAlDia(scorers, [], [{ fx: anoche, goals: [gol(99)] }]);
    expect(r).toEqual({ scorers, assists: [], adelantado: false });
  });
});
