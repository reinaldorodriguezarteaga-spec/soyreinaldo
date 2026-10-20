import { describe, expect, it } from "vitest";
import { desdeAlineacion } from "../desde-alineacion";
import { FORMACIONES, huecos } from "../formaciones";

const jug = (id: number, grid: string | null) => ({ id, number: id, name: `J${id}`, pos: null, grid });
/** Alineación con casillas a partir de "4-2-3-1" (columnas de izquierda a derecha). */
function alineacion(formation: string) {
  const lineas = [1, ...formation.split("-").map(Number)];
  let id = 1;
  const startXI = lineas.flatMap((n, f) => Array.from({ length: n }, (_, c) => jug(id++, `${f + 1}:${c + 1}`)));
  return { formation, startXI };
}

describe("pizarra desde la alineación del partido", () => {
  it("formación nuestra: cada titular a su hueco, sin mover nada", () => {
    const r = desdeAlineacion(alineacion("4-2-3-1"), "local")!;
    expect(r.formacion).toBe("4-2-3-1");
    expect(r.once).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(r.movidos).toEqual({});
    // El 2 (columna 1 de la defensa) es el lateral izquierdo.
    expect(huecos("4-2-3-1", "local")[1].rol).toBe("LI");
  });

  it("formación que no tenemos: posiciones de la rejilla, reflejadas para el visitante", () => {
    const r = desdeAlineacion(alineacion("3-1-4-2"), "visitante")!;
    expect(FORMACIONES.includes("3-1-4-2")).toBe(false);
    expect(r.once.filter((x) => x != null)).toHaveLength(11);
    expect(Object.keys(r.movidos)).toHaveLength(11);
    expect(r.movidos["visitante:0"].x).toBeGreaterThan(0.9); // portero en su portería
  });

  it("sin casillas: en orden y con la formación inicial", () => {
    const r = desdeAlineacion({ formation: "4-4-2", startXI: [jug(1, null), jug(2, null)] }, "local")!;
    expect(r.once.slice(0, 3)).toEqual([1, 2, null]);
  });

  it("sin alineación: null", () => {
    expect(desdeAlineacion(null, "local")).toBeNull();
    expect(desdeAlineacion({ formation: null, startXI: [] }, "local")).toBeNull();
  });
});
