import { describe, expect, it } from "vitest";
import { MAX_PUNTOS, NIVELES, type Nivel, puntosAdivinar, puntosLeyenda, puntosMasOMenos, puntosTikitaka, reloj } from "../niveles";

describe("niveles y puntos", () => {
  it("adivinar: fallos restan, el tiempo suma y el nivel multiplica", () => {
    expect(puntosAdivinar({ acertado: false, fallos: 1, sobra: 50, nivel: "facil" })).toBe(0);
    expect(puntosAdivinar({ acertado: true, fallos: 0, sobra: 60, nivel: "facil" })).toBe(160);
    expect(puntosAdivinar({ acertado: true, fallos: 2, sobra: 30, nivel: "dificil" })).toBe(200);
  });
  it("los máximos posibles caben en el tope del servidor", () => {
    for (const nivel of Object.keys(NIVELES) as Nivel[]) {
      const sobra = NIVELES[nivel].segundos; // nunca sobra más que el tiempo del nivel
      expect(puntosAdivinar({ acertado: true, fallos: 0, sobra, nivel })).toBeLessThanOrEqual(MAX_PUNTOS.equipo);
      expect(puntosTikitaka({ aciertos: 9, sobra, nivel })).toBeLessThanOrEqual(MAX_PUNTOS.tikitaka);
      expect(puntosLeyenda({ mejores: 11, sobra, nivel, terminado: true })).toBeLessThanOrEqual(MAX_PUNTOS.leyenda);
    }
    expect(puntosMasOMenos({ racha: 30, nivel: "facil" })).toBe(300);
  });
  it("reloj", () => {
    expect(reloj(90)).toBe("1:30");
    expect(reloj(5)).toBe("0:05");
    expect(reloj(-3)).toBe("0:00");
  });
});
