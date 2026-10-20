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
      zonas: [{ a: { x: 0.1, y: 0.1 }, b: { x: 0.3, y: 0.4 }, color: "#facc15" }],
      textos: [{ p: { x: 0.5, y: 0.2 }, t: "Presión alta" }],
      focos: ["l:2"],
      colores: { local: "#a50044", visitante: "#ffffff" },
      etapas: [
        { jug: { "l:1": { x: 0.2, y: 0.3 }, "v:10": { x: 0.8, y: 0.7 } }, balon: null, flechas: [] },
        {
          jug: { "l:1": { x: 0.4, y: 0.3 } },
          balon: { x: 0.4, y: 0.31 },
          flechas: [{ a: { x: 0.4, y: 0.3 }, b: { x: 0.6, y: 0.5 }, tipo: "pase" }],
        },
      ],
    };
    expect(decodificar(codificar(e), plantillas)).toEqual(e);
  });

  it("etapas: fuera los jugadores que no son de la plantilla", () => {
    const raro = btoa(JSON.stringify({ e: [[[["l:1", 100, 100], ["l:99", 1, 1], ["x:1", 1, 1]], 0, []]] }));
    expect(decodificar(raro, plantillas)!.etapas[0].jug).toEqual({ "l:1": { x: 0.1, y: 0.1 } });
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

  it("zonas, textos, focos y colores: solo lo válido", () => {
    const raro = btoa(
      JSON.stringify({
        z: [[0, 0, 500, 500, 99], [0, 0, 500, 500, 5]],
        t: [[100, 100, "  " + "x".repeat(80)], [1, 1, 7], [1, 1, "   "]],
        k: ["l:1", "l:1", "l:99", "zz"],
        c: [3, 999],
      }),
    );
    const e = decodificar(raro, plantillas)!;
    expect(e.zonas).toEqual([{ a: { x: 0, y: 0 }, b: { x: 0.5, y: 0.5 }, color: "#facc15" }]);
    expect(e.textos).toHaveLength(1);
    expect(e.textos[0].t).toHaveLength(60);
    expect(e.focos).toEqual(["l:1"]);
    expect(e.colores).toEqual({ local: "#a50044", visitante: "#ff5b8a" });
  });

  it("basura o demasiado largo: null", () => {
    expect(decodificar("no-es-base64!!", plantillas)).toBeNull();
    expect(decodificar("a".repeat(13000), plantillas)).toBeNull();
    expect(decodificar(undefined, plantillas)).toBeNull();
  });
});
