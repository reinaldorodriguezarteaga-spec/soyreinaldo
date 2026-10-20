import { describe, expect, it } from "vitest";
import { FORMACIONES, huecoParaJugador, huecos, onceAutomatico } from "../formaciones";

describe("formaciones de la pizarra", () => {
  it("todas tienen 11 huecos, un portero, y cada equipo en su mitad", () => {
    for (const f of FORMACIONES) {
      const l = huecos(f, "local");
      const v = huecos(f, "visitante");
      expect(l).toHaveLength(11);
      expect(l.filter((h) => h.grupo === "G")).toHaveLength(1);
      expect(l.every((h) => h.x < 0.5)).toBe(true);
      expect(v.every((h) => h.x > 0.5)).toBe(true);
    }
  });

  it("el visitante es el reflejo del local", () => {
    const l = huecos("4-3-3", "local");
    const v = huecos("4-3-3", "visitante");
    expect(v[1].x).toBeCloseTo(1 - l[1].x);
    expect(v[1].y).toBeCloseTo(1 - l[1].y);
    expect(v[1].rol).toBe(l[1].rol);
  });

  it("coloca a cada jugador en un hueco de su línea", () => {
    const vacio = Array(11).fill(null);
    expect(huecoParaJugador("4-3-3", vacio, "Goalkeeper")).toBe(0);
    expect(huecos("4-3-3", "local")[huecoParaJugador("4-3-3", vacio, "Attacker")].grupo).toBe("F");
    const conPortero = [7, ...Array(10).fill(null)];
    expect(huecoParaJugador("4-3-3", conPortero, "Goalkeeper")).toBe(-1);
  });

  it("once automático: portero a portería y sin repetir jugadores", () => {
    const plantilla = [
      { id: 1, position: "Goalkeeper" },
      { id: 2, position: "Goalkeeper" },
      ...Array.from({ length: 6 }, (_, i) => ({ id: 10 + i, position: "Defender" })),
      ...Array.from({ length: 6 }, (_, i) => ({ id: 20 + i, position: "Midfielder" })),
      ...Array.from({ length: 2 }, (_, i) => ({ id: 30 + i, position: "Attacker" })),
    ];
    const once = onceAutomatico("4-3-3", plantilla);
    expect(once[0]).toBe(1);
    expect(new Set(once.filter((x) => x != null)).size).toBe(11);
    // Solo 2 delanteros para 3 huecos de ataque: el tercero sale de otra línea.
    expect(once.every((x) => x != null)).toBe(true);
  });
});
