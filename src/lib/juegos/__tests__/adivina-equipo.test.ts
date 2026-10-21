import { describe, expect, it } from "vitest";
import { RETOS } from "../equipos-historicos";
import { numeroDelDia, opcionesDe, pistas, retoDelDia, retosDe, textoCompartir } from "../adivina-equipo";

describe("adivina el equipo", () => {
  it("cada reto tiene once jugadores y su formación cuadra", () => {
    for (const r of RETOS) {
      const n = r.lineas.flat().length;
      expect(n, r.id).toBe(11);
      expect(r.lineas[0], r.id).toHaveLength(1);
      expect(r.formacion.split("-").map(Number), r.id).toEqual(r.lineas.slice(1).map((l) => l.length));
    }
    expect(new Set(RETOS.map((r) => r.id)).size).toBe(RETOS.length);
  });

  it("dificultades: fácil solo LaLiga y Premier; difícil, todo", () => {
    expect(retosDe("facil").every((r) => r.liga === "laliga" || r.liga === "premier")).toBe(true);
    expect(retosDe("dificil")).toHaveLength(RETOS.length);
    expect(opcionesDe("facil").some((e) => e.liga === "bundesliga")).toBe(false);
    // El equipo de cada reto está entre las opciones de su dificultad.
    for (const r of retosDe("medio")) expect(opcionesDe("medio").some((e) => e.id === r.equipoId)).toBe(true);
  });

  it("número del día en hora de Madrid", () => {
    expect(numeroDelDia(new Date("2026-10-22T10:00:00Z"))).toBe(1);
    expect(numeroDelDia(new Date("2026-10-22T22:30:00Z"))).toBe(2); // 00:30 en Madrid
    expect(numeroDelDia(new Date("2026-10-01T10:00:00Z"))).toBe(1);
  });

  it("el reto del día no se repite hasta pasar por todos", () => {
    const vistos = new Set(Array.from({ length: RETOS.length }, (_, i) => retoDelDia(i + 1).id));
    expect(vistos.size).toBe(RETOS.length);
    expect(retoDelDia(5).id).toBe(retoDelDia(5).id);
  });

  it("pistas y texto para compartir", () => {
    const r = RETOS[0];
    expect(pistas(r, 0)).toEqual([]);
    expect(pistas(r, 2).map((p) => p.titulo)).toEqual(["Liga", "Temporada"]);
    expect(pistas(r, 9)).toHaveLength(4);
    expect(textoCompartir({ numero: 3, acertado: true, intentos: 2 })).toContain("#3 · 2/5\n🟥🟩");
    expect(textoCompartir({ numero: null, acertado: false, intentos: 5 })).toContain("X/5\n🟥🟥🟥🟥🟥");
  });
});
