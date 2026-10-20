import { describe, expect, it } from "vitest";
import { codificar, decodificar, estadoInicial, type Estado } from "../estado";

const plantillas = { local: [1, 2, 3], visitante: [10, 11] };

describe("estado de la pizarra en la URL", () => {
  it("ida y vuelta", () => {
    const e: Estado = {
      ...estadoInicial(),
      formacion: { local: "4-4-2", visitante: "3-5-2" },
      once: { local: [1, 2, ...Array(9).fill(null)], visitante: [10, ...Array(10).fill(null)] },
      movidos: { "local:1": { x: 0.3, y: 0.25 } },
      flechas: [{ a: { x: 0.1, y: 0.2 }, b: { x: 0.5, y: 0.6 }, tipo: "carrera" }],
      balon: { x: 0.5, y: 0.5 },
    };
    expect(decodificar(codificar(e), plantillas)).toEqual(e);
  });

  it("descarta lo que no vale: formaciones, jugadores ajenos y repetidos, claves raras", () => {
    const malo = btoa(
      JSON.stringify({
        f: ["9-9-9", "4-3-3"],
        o: [[1, 1, 99, "x"], [10]],
        m: { l99: [1, 1], x1: [1, 1], v2: [500, 2000] },
        a: [[0, 0, 1000, 1000, 1], ["a"]],
        b: [500, "x"],
      }),
    );
    const e = decodificar(malo, plantillas)!;
    expect(e.formacion.local).toBe("4-3-3");
    expect(e.once.local.slice(0, 4)).toEqual([1, null, null, null]);
    expect(Object.keys(e.movidos)).toEqual(["visitante:2"]);
    expect(e.movidos["visitante:2"]).toEqual({ x: 0.5, y: 1 });
    expect(e.flechas).toHaveLength(1);
    expect(e.balon).toBeNull();
  });

  it("basura o demasiado largo: null", () => {
    expect(decodificar("no-es-base64!!", plantillas)).toBeNull();
    expect(decodificar("a".repeat(5000), plantillas)).toBeNull();
    expect(decodificar(undefined, plantillas)).toBeNull();
  });
});
