import { describe, expect, it } from "vitest";
import { puestos, puntosDeLaJornada, resumenPorJugador } from "../jornada";

const baremo = { exacto: 5, acierto: 2 };

describe("jornada de la quiniela", () => {
  it("suma puntos, exactos y aciertos por jugador", () => {
    const r = puntosDeLaJornada(
      [
        { id: 1, home: 2, away: 1 },
        { id: 2, home: 0, away: 0 },
      ],
      [
        { userId: "a", matchId: 1, home: 2, away: 1 }, // exacto 5
        { userId: "a", matchId: 2, home: 1, away: 1 }, // acierto 2
        { userId: "b", matchId: 1, home: 0, away: 3 }, // 0
        { userId: "b", matchId: 99, home: 1, away: 0 }, // partido de otra jornada: fuera
      ],
      baremo,
    );
    expect(r.get("a")).toEqual({ puntos: 7, exactos: 1, aciertos: 1, jugados: 2 });
    expect(r.get("b")).toEqual({ puntos: 0, exactos: 0, aciertos: 0, jugados: 1 });
  });

  it("los empates comparten puesto", () => {
    const p = puestos([
      { userId: "a", total: 30 },
      { userId: "b", total: 25 },
      { userId: "c", total: 25 },
      { userId: "d", total: 10 },
    ]);
    expect([p.get("a"), p.get("b"), p.get("c"), p.get("d")]).toEqual([1, 2, 2, 4]);
  });

  it("el puesto de antes sale de restar lo ganado en la jornada", () => {
    const jornada = new Map([
      ["a", { puntos: 2, exactos: 0, aciertos: 1, jugados: 1 }],
      ["b", { puntos: 15, exactos: 3, aciertos: 0, jugados: 3 }],
    ]);
    const r = resumenPorJugador(jornada, [
      { userId: "a", total: 40 },
      { userId: "b", total: 45 },
    ]);
    // Antes: a 38, b 30 → a 1º, b 2º. Ahora: b 1º, a 2º.
    expect(r.get("b")).toMatchObject({ puestoAntes: 2, puestoAhora: 1, totalJugadores: 2 });
    expect(r.get("a")).toMatchObject({ puestoAntes: 1, puestoAhora: 2 });
  });
});
