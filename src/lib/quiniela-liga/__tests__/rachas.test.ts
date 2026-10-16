import { describe, expect, it } from "vitest";
import { calcularRachas, type FilaHistorial } from "../rachas";

const f = (user_id: string, matchday: number, h: number, finished: boolean, acierto: boolean): FilaHistorial => ({
  user_id,
  matchday,
  kickoff_at: new Date(Date.UTC(2026, 7, 1) + (matchday * 100 + h) * 3_600_000).toISOString(),
  finished,
  acierto,
});

describe("rachas de la quiniela", () => {
  it("jornadas seguidas: la jornada en curso sin jugar no rompe la racha", () => {
    const filas = [
      f("ana", 1, 0, true, true),
      f("ana", 2, 0, true, true),
      f("ana", 3, 0, true, false),
      f("luis", 4, 0, false, false), // la jornada 4 está en curso
      f("luis", 3, 0, true, true),
      f("luis", 1, 0, true, true),
    ];
    const r = calcularRachas(filas);
    expect(r.get("ana")!.jornadas).toBe(3); // 3, 2, 1 (la 4 aún no)
    expect(r.get("luis")!.jornadas).toBe(2); // 4, 3 y falta la 2
  });

  it("aciertos seguidos y mejor racha, en orden de hora", () => {
    const filas = [
      f("ana", 1, 0, true, true),
      f("ana", 1, 1, true, true),
      f("ana", 1, 2, true, true),
      f("ana", 2, 0, true, false),
      f("ana", 2, 1, true, true),
      f("ana", 2, 2, false, false), // sin terminar: no cuenta
    ];
    const r = calcularRachas(filas).get("ana")!;
    expect(r.aciertos).toBe(1);
    expect(r.mejorAciertos).toBe(3);
  });
});
