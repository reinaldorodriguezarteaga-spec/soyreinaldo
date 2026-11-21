import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { describe, expect, it } from "vitest";
import { PANELES, mezclar } from "../agrupa";
import { MOMENTOS, partidaCronologia } from "../cronologia";
import { comparar } from "../misterioso-comun";
import type { Futbolista } from "../futbolistas-comun";

describe("Agrupa los cuatro: paneles", () => {
  it.each(PANELES.map((p) => [p.id, p] as const))("%s: 4 grupos de 4, 16 nombres distintos y un grupo por nivel", (_id, panel) => {
    const nombres = panel.grupos.flatMap((g) => g.nombres);
    expect(panel.grupos).toHaveLength(4);
    expect(new Set(nombres).size).toBe(16);
    expect(new Set(panel.grupos.map((g) => g.nivel)).size).toBe(4);
    expect([...mezclar(panel, 3)].sort()).toEqual([...nombres].sort());
  });

  it("ids únicos", () => {
    expect(new Set(PANELES.map((p) => p.id)).size).toBe(PANELES.length);
  });
});

describe("Cronología", () => {
  it("ids únicos", () => {
    expect(new Set(MOMENTOS.map((m) => m.id)).size).toBe(MOMENTOS.length);
  });
  it("cada partida: 5 momentos de años distintos", () => {
    for (let s = 1; s < 300; s++) {
      const p = partidaCronologia(s);
      expect(p).toHaveLength(5);
      expect(new Set(p.map((m) => m.anio)).size).toBe(5);
    }
  });
});

describe("Futbolista misterioso: comparar", () => {
  const base: Futbolista = {
    id: 1, nombre: "A", apellido: "A", liga: { id: 140, nombre: "LaLiga" }, equipo: { id: 529, nombre: "Barcelona" },
    posicion: "Delantero", edad: 25, dorsal: 9, bandera: "es", pais: "Spain", foto: true, respuesta: true,
  };
  it("igual, cerca y lejos, con flecha hacia el misterioso", () => {
    const intento = { ...base, id: 2, equipo: { id: 541, nombre: "Real Madrid" }, edad: 24, dorsal: 20 };
    const r = Object.fromEntries(comparar(intento, base).map((x) => [x.campo, x]));
    expect(r.Liga.estado).toBe("ok");
    expect(r.Equipo.estado).toBe("no");
    expect(r.Edad).toMatchObject({ estado: "cerca", flecha: "arriba" });
    expect(r.Dorsal).toMatchObject({ estado: "no", flecha: "abajo" });
  });
});

describe("Jugadores para escribir y respuestas (20-nov)", () => {
  it("se pueden escribir los de la plantilla que no son respuesta", async () => {
    const { TODOS, FUTBOLISTAS } = await import("../futbolistas");
    const musiala = TODOS.find((j) => j.nombre.includes("Musiala"));
    expect(musiala).toBeTruthy();
    expect(FUTBOLISTAS.every((j) => j.respuesta)).toBe(true);
    expect(FUTBOLISTAS.length).toBe(384);
  });
});
