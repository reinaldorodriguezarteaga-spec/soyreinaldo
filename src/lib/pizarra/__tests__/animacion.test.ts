import { describe, expect, it } from "vitest";
import { duracion, fotograma, PAUSA, TRANSICION } from "../animacion";
import type { Etapa } from "../estado";

const e1: Etapa = { jug: { "l:1": { x: 0, y: 0 }, "l:2": { x: 0.5, y: 0.5 } }, balon: { x: 0, y: 0 }, flechas: [] };
const e2: Etapa = { jug: { "l:1": { x: 1, y: 1 } }, balon: { x: 1, y: 0 }, flechas: [] };

describe("animación por etapas", () => {
  it("duración: pausa en cada etapa + transición entre ellas", () => {
    expect(duracion(0)).toBe(0);
    expect(duracion(1)).toBeCloseTo(PAUSA);
    expect(duracion(3)).toBeCloseTo(3 * PAUSA + 2 * TRANSICION);
  });

  it("quieto en la pausa, a mitad en mitad de la transición, al final en la última", () => {
    expect(fotograma([e1, e2], 0.1)!.jug["l:1"]).toEqual({ x: 0, y: 0 });
    const medio = fotograma([e1, e2], PAUSA + TRANSICION / 2)!;
    expect(medio.jug["l:1"].x).toBeCloseTo(0.5);
    expect(medio.balon!.x).toBeCloseTo(0.5);
    // El 2 no está en la etapa 2: se queda donde estaba.
    expect(medio.jug["l:2"]).toEqual({ x: 0.5, y: 0.5 });
    expect(fotograma([e1, e2], duracion(2) + 5)!.jug["l:1"]).toEqual({ x: 1, y: 1 });
  });

  it("sin etapas: null", () => {
    expect(fotograma([], 1)).toBeNull();
  });
});
