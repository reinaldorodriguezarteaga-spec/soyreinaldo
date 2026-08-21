import { describe, expect, it } from "vitest";
import { proyectarPosiciones, type FilaClasificacion } from "../standings-projection";

// Tabla de juguete: A líder, luego B, C y D.
const tabla: FilaClasificacion[] = [
  { teamId: 1, points: 10, goalsDiff: 5, goalsFor: 12 }, // A
  { teamId: 2, points: 8, goalsDiff: 3, goalsFor: 10 }, // B
  { teamId: 3, points: 7, goalsDiff: 1, goalsFor: 8 }, // C
  { teamId: 4, points: 7, goalsDiff: -2, goalsFor: 6 }, // D
];

describe("proyección de la clasificación", () => {
  it("sube al que gana por encima del que tenía delante", () => {
    // C (7) gana a D: 10 puntos, empata con A pero le supera nadie...
    const r = proyectarPosiciones(tabla, 3, 4, 3, 0);
    expect(r.local).toBe(2); // C adelanta a B, y no a A por diferencia de goles
    expect(r.visitante).toBe(4);
  });

  it("con el empate reparte un punto a cada uno", () => {
    const r = proyectarPosiciones(tabla, 3, 4, 1, 1);
    expect(r.local).toBe(3); // C sigue 3º con 8, por detrás de B por diferencia
    expect(r.visitante).toBe(4);
  });

  it("es simétrica: si gana el visitante, sube él", () => {
    const r = proyectarPosiciones(tabla, 3, 4, 0, 3);
    expect(r.visitante).toBeLessThan(r.local);
  });

  it("desempata por diferencia de goles antes que por goles a favor", () => {
    // C y D quedan a 10 puntos; C tiene mejor diferencia.
    const r = proyectarPosiciones(tabla, 3, 4, 3, 3);
    expect(r.local).toBeLessThan(r.visitante);
  });

  it("no mueve a los equipos que no juegan", () => {
    const r = proyectarPosiciones(tabla, 3, 4, 3, 0);
    // A sigue siendo líder pase lo que pase en ese partido.
    expect(r.local).not.toBe(1);
  });

  it("devuelve 0 si el equipo no está en la tabla, sin lanzar", () => {
    const r = proyectarPosiciones(tabla, 99, 4, 3, 0);
    expect(r.local).toBe(0);
  });
});
