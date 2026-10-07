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

  it("último resultado: el partido más reciente de cada equipo", () => {
    const f = formaEquipos(jugados, null);
    expect(f.get(1)?.ultimo).toBe("E");
    expect(f.get(2)?.ultimo).toBe("V");
    expect(f.get(3)?.ultimo).toBe("D");
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
    expect(f.get(2)).toEqual({ puesto: 1, dg: 5, ultimo: "V" });
    expect(f.get(3)).toEqual({ puesto: null, dg: null, ultimo: "D" });
  });
});
