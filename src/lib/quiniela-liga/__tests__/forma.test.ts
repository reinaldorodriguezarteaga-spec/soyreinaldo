import { describe, expect, it } from "vitest";
import { formaEquipos } from "../forma";

const p = (local: number, visitante: number, gl: number, gv: number, dia: number) => ({
  local,
  visitante,
  golesLocal: gl,
  golesVisitante: gv,
  kickoffAt: `2026-09-${String(dia).padStart(2, "0")}T19:00:00Z`,
});

describe("forma de los equipos", () => {
  const jugados = [
    p(1, 2, 3, 0, 1), // 1 gana
    p(3, 1, 1, 1, 8), // empate: último del 1 es E
    p(2, 3, 2, 1, 15), // 2 gana: último del 2 es V y del 3 es D
  ];

  it("racha: del más antiguo al más reciente", () => {
    const f = formaEquipos(jugados, null);
    expect(f.get(1)?.racha).toEqual(["V", "E"]);
    expect(f.get(2)?.racha).toEqual(["D", "V"]);
    expect(f.get(3)?.racha).toEqual(["E", "D"]);
  });

  it("racha: solo los últimos 5, aunque lleguen desordenados", () => {
    const muchos = [10, 3, 7, 1, 5, 9, 2].map((dia) =>
      p(1, 2, dia % 2 === 0 ? 1 : 0, 0, dia),
    );
    // Por fecha: 1E 2V 3E 5E 7E 9E 10V → últimos 5: 3,5,7,9,10
    expect(formaEquipos(muchos, null).get(1)?.racha).toEqual(["E", "E", "E", "E", "V"]);
  });

  it("sin tabla oficial: puesto y DG calculados", () => {
    const f = formaEquipos(jugados, null);
    // 1: 4 pts, +3 · 2: 3 pts, -2 · 3: 1 pt, -1
    expect(f.get(1)).toMatchObject({ puesto: 1, dg: 3 });
    expect(f.get(2)).toMatchObject({ puesto: 2, dg: -2 });
    expect(f.get(3)).toMatchObject({ puesto: 3, dg: -1 });
  });

  it("con tabla oficial manda la oficial", () => {
    const f = formaEquipos(jugados, [
      { teamId: 1, puesto: 2, dg: 3 },
      { teamId: 2, puesto: 1, dg: 5 },
    ]);
    expect(f.get(2)).toEqual({ puesto: 1, dg: 5, racha: ["D", "V"] });
    expect(f.get(3)).toEqual({ puesto: null, dg: null, racha: ["E", "D"] });
  });
});
