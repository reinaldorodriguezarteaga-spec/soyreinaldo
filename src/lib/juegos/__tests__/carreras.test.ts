import { describe, expect, it } from "vitest";
import { CLUBES, JUGADORES } from "../carreras";
import { DEL_DIA, jugadorDelDia, pistasJugador, textoCompartirJugador } from "../adivina-jugador";
import { jugaronEnAmbos, tableroDelDia } from "../tikitaka";

describe("carreras", () => {
  it("datos coherentes", () => {
    expect(new Set(JUGADORES.map((j) => j.id)).size).toBe(JUGADORES.length);
    expect(new Set(JUGADORES.map((j) => j.nombre)).size).toBe(JUGADORES.length);
    const ids = Object.values(CLUBES).map(([id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const j of JUGADORES) {
      expect(j.carrera.length, j.id).toBeGreaterThan(0);
      for (const c of j.carrera) expect(CLUBES[c], `${j.id}: ${c}`).toBeDefined();
    }
  });

  it("adivina el jugador: reto del día y pistas", () => {
    const vistos = new Set(Array.from({ length: DEL_DIA.length }, (_, i) => jugadorDelDia(i + 1).id));
    expect(vistos.size).toBe(DEL_DIA.length);
    expect(DEL_DIA.every((j) => j.carrera.length >= 3)).toBe(true);
    const messi = JUGADORES.find((j) => j.id === "messi")!;
    expect(pistasJugador(messi, 4).map((p) => p.texto)).toEqual(["Delantero", "", "1987", "L. M."]);
    expect(textoCompartirJugador({ numero: 2, acertado: true, intentos: 1 })).toContain("#2 · 1/5\n🟩");
  });

  it("tiki-taka-toe: todos los tableros de un año tienen respuesta en cada casilla", () => {
    for (let n = 1; n <= 365; n++) {
      const t = tableroDelDia(n);
      expect(new Set([...t.filas, ...t.columnas]).size).toBe(6);
      for (const f of t.filas) for (const c of t.columnas) expect(jugaronEnAmbos(f, c).length).toBeGreaterThan(0);
    }
  });
});
