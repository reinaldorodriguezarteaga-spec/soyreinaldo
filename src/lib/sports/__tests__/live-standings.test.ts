import { describe, expect, it } from "vitest";
import { mergeLiveStandingsFlat, pendingFixtures } from "../live-standings";
import type { Fixture, StandingRow } from "../api-football";

function fila(
  rank: number,
  id: number,
  points: number,
  goalsDiff: number,
  goalsFor: number,
): StandingRow {
  return {
    rank,
    team: { id, name: `Equipo ${id}`, logo: "" },
    points,
    goalsDiff,
    all: { played: 4, win: 0, draw: 0, lose: 0, goals: { for: goalsFor, against: 0 } },
    form: null,
  };
}

// A líder con 10, B 2º con 8, C 3º con 7.
const tabla: StandingRow[] = [
  fila(1, 1, 10, 5, 12),
  fila(2, 2, 8, 3, 10),
  fila(3, 3, 7, 1, 8),
];

function partido(homeId: number, awayId: number, gh: number, ga: number, live = true): Fixture {
  return {
    fixture: {
      id: 999,
      date: new Date().toISOString(),
      status: { long: "", short: live ? "2H" : "FT", elapsed: live ? 60 : 90 },
      venue: { name: null, city: null },
    },
    league: { id: 1, name: "", logo: "", round: "" },
    teams: {
      home: { id: homeId, name: "", logo: "", winner: null },
      away: { id: awayId, name: "", logo: "", winner: null },
    },
    goals: { home: gh, away: ga },
  };
}

describe("mergeLiveStandingsFlat", () => {
  it("suma el marcador parcial y reordena", () => {
    // C (3º, 7 pts) va ganando a B (2º, 8 pts) 2-0: con esos 3 puntos
    // provisionales (10) empata con A, pero A sigue 1º por diferencia.
    const live = mergeLiveStandingsFlat(tabla, [partido(3, 2, 2, 0)]);
    const porEquipo = new Map(live.map((r) => [r.team.id, r]));
    expect(porEquipo.get(1)!.rank).toBe(1); // A no juega, sigue líder
    expect(porEquipo.get(3)!.points).toBe(10);
    expect(porEquipo.get(3)!.rank).toBe(2); // C sube del 3º al 2º
    expect(porEquipo.get(2)!.rank).toBe(3); // B baja
  });

  it("marca isPlaying solo en los equipos con partido EN JUEGO (no ya terminado)", () => {
    const live = mergeLiveStandingsFlat(tabla, [partido(3, 2, 1, 0, true)]);
    const porEquipo = new Map(live.map((r) => [r.team.id, r]));
    expect(porEquipo.get(3)!.isPlaying).toBe(true);
    expect(porEquipo.get(2)!.isPlaying).toBe(true);
    expect(porEquipo.get(1)!.isPlaying).toBe(false);
  });

  it("delta refleja puestos ganados (+) o perdidos (-) frente a la tabla oficial", () => {
    const live = mergeLiveStandingsFlat(tabla, [partido(3, 2, 2, 0)]);
    const porEquipo = new Map(live.map((r) => [r.team.id, r]));
    expect(porEquipo.get(3)!.delta).toBeGreaterThan(0); // sube
    expect(porEquipo.get(2)!.delta).toBeLessThan(0); // baja
    expect(porEquipo.get(1)!.delta).toBe(0); // no se mueve
  });

  it("sin partidos pendientes, no toca la tabla", () => {
    const live = mergeLiveStandingsFlat(tabla, []);
    expect(live.map((r) => r.team.id)).toEqual([1, 2, 3]);
    expect(live.every((r) => !r.isPlaying)).toBe(true);
  });
});

describe("pendingFixtures", () => {
  it("incluye los partidos en juego", () => {
    const f = partido(1, 2, 1, 0, true);
    expect(pendingFixtures([f], new Set())).toEqual([f]);
  });

  it("excluye los terminados que no vienen de un poll anterior (sin carryId)", () => {
    const f = partido(1, 2, 1, 0, false);
    expect(pendingFixtures([f], new Set())).toEqual([]);
  });

  it("incluye un terminado si su id está en carryIds (arrastre entre polls)", () => {
    const f = partido(1, 2, 1, 0, false);
    expect(pendingFixtures([f], new Set([f.fixture.id]))).toEqual([f]);
  });
});
