import { describe, expect, it } from "vitest";
import { cerrado, puntuar } from "../adivina-once";

describe("adivina el once", () => {
  const once = Array.from({ length: 11 }, (_, i) => i + 1);
  it("puntos: aciertos, formación y pleno", () => {
    expect(puntuar({ jugadores: once, formacion: "4-3-3" }, { titulares: once, formacion: "4-3-3" })).toEqual({ aciertos: 11, formacionOk: true, puntos: 15 });
    expect(puntuar({ jugadores: once, formacion: "4-4-2" }, { titulares: [1, 2, 3, 20, 21, 22, 23, 24, 25, 26, 27], formacion: "4-3-3" })).toEqual({ aciertos: 3, formacionOk: false, puntos: 3 });
    expect(puntuar({ jugadores: once, formacion: "4-3-3" }, { titulares: once, formacion: null }).formacionOk).toBe(false);
  });
  it("se cierra una hora antes", () => {
    const k = new Date("2026-10-25T20:00:00Z");
    expect(cerrado(k, new Date("2026-10-25T18:59:00Z"))).toBe(false);
    expect(cerrado(k, new Date("2026-10-25T19:00:00Z"))).toBe(true);
  });
});
