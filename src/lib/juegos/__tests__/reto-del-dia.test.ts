import { describe, expect, it } from "vitest";
import { JUEGOS_DIARIOS, retoDelDia, rutaDelJuego } from "../reto-del-dia";
import { NOMBRE_JUEGO } from "../niveles";

describe("reto del día", () => {
  it("cubre los 12 juegos con ranking", () => {
    expect(new Set(JUEGOS_DIARIOS.map((j) => j.juego))).toEqual(new Set(Object.keys(NOMBRE_JUEGO)));
  });

  it("no repite ninguno hasta que han salido todos", () => {
    for (const vuelta of [0, 1, 5]) {
      const dias = Array.from({ length: 12 }, (_, i) => retoDelDia(vuelta * 12 + i + 1).juego);
      expect(new Set(dias).size).toBe(12);
    }
  });

  it("es el mismo para el mismo día", () => {
    expect(retoDelDia(40)).toBe(retoDelDia(40));
  });

  it("da la ruta de cada juego", () => {
    expect(rutaDelJuego("top10")).toBe("/juegos/top-10");
  });
});
