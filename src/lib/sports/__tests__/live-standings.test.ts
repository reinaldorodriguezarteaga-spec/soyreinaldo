import { describe, expect, it } from "vitest";
import { completarClasificacion, mergeLiveStandingsFlat, pendingFixtures } from "../live-standings";
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

describe("completarClasificacion", () => {
  // Jornada 1 ya contada por el API (todos con 1 jugado); falta la 2.
  const base = (rank: number, id: number, points: number, gf: number, gc: number, form: string): StandingRow => ({
    rank,
    team: { id, name: `Equipo ${id}`, logo: "" },
    points,
    goalsDiff: gf - gc,
    all: { played: 1, win: points === 3 ? 1 : 0, draw: points === 1 ? 1 : 0, lose: points === 0 ? 1 : 0, goals: { for: gf, against: gc } },
    home: { played: 1, win: 0, draw: 0, lose: 0, goals: { for: 0, against: 0 } },
    away: { played: 0, win: 0, draw: 0, lose: 0, goals: { for: 0, against: 0 } },
    form,
  });
  const terminado = (id: number, fecha: string, h: number, a: number, gh: number, ga: number): Fixture => ({
    ...partido(h, a, gh, ga, false),
    fixture: { id, date: fecha, status: { long: "", short: "FT", elapsed: 90 }, venue: { name: null, city: null } },
    league: { id: 140, name: "La Liga", logo: "", round: "Regular Season - 2" },
  });
  const jornada1 = [
    terminado(1, "2026-10-01T18:00:00Z", 1, 2, 2, 0),
    terminado(2, "2026-10-01T20:00:00Z", 3, 4, 1, 1),
  ];

  it("suma los partidos terminados que el API aún no cuenta y reordena", () => {
    const tabla = [base(1, 1, 3, 2, 0, "W"), base(2, 3, 1, 1, 1, "D"), base(3, 4, 1, 1, 1, "D"), base(4, 2, 0, 0, 2, "L")];
    // Jornada 2: el 3 empata 0-0 con el 2 (como el Celta-Betis) y el 4 gana al 1.
    const r = completarClasificacion(tabla, [
      ...jornada1,
      terminado(3, "2026-10-25T14:15:00Z", 3, 2, 0, 0),
      terminado(4, "2026-10-25T16:00:00Z", 4, 1, 3, 0),
    ]);
    const e = new Map(r.map((x) => [x.team.id, x]));
    expect(e.get(3)!.all.played).toBe(2);
    expect(e.get(3)!.points).toBe(2);
    expect(e.get(3)!.form).toBe("DD"); // el más reciente primero
    expect(e.get(4)!.points).toBe(4);
    expect(e.get(4)!.rank).toBe(1); // 4 pts, por delante del 1 (3 pts)
    expect(e.get(1)!.all.lose).toBe(1);
  });

  it("cuadra aunque el API haya contado el partido solo para uno de los dos", () => {
    // Como el Rayo-Elche: el 2 ya tiene el partido 3 contado; el 3 no.
    const tabla = [
      base(1, 1, 3, 2, 0, "W"),
      { ...base(2, 3, 1, 1, 1, "D") },
      base(3, 4, 1, 1, 1, "D"),
      { ...base(4, 2, 1, 0, 2, "DL"), all: { played: 2, win: 0, draw: 1, lose: 1, goals: { for: 0, against: 2 } } },
    ];
    const r = completarClasificacion(tabla, [...jornada1, terminado(3, "2026-10-25T14:15:00Z", 3, 2, 0, 0)]);
    const e = new Map(r.map((x) => [x.team.id, x]));
    expect(e.get(3)!.all.played).toBe(2);
    expect(e.get(2)!.all.played).toBe(2); // no se le suma dos veces
    expect(e.get(2)!.points).toBe(1);
  });

  it("si cuadra, deja la tabla oficial tal cual", () => {
    const tabla = [base(1, 1, 3, 2, 0, "W"), base(2, 3, 1, 1, 1, "D"), base(3, 4, 1, 1, 1, "D"), base(4, 2, 0, 0, 2, "L")];
    expect(completarClasificacion(tabla, jornada1)).toBe(tabla);
  });
});

