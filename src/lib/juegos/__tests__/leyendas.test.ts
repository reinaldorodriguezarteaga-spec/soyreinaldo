import { describe, expect, it } from "vitest";
import { HUECOS, LEYENDAS, LINEAS, resultado, ternas } from "../leyendas";

describe("once de leyenda", () => {
  it("datos: nombres únicos y medias razonables", () => {
    const todos = Object.values(LEYENDAS).flat();
    expect(new Set(todos.map((x) => x.nombre)).size).toBe(todos.length);
    expect(todos.every((x) => x.media >= 80 && x.media <= 99)).toBe(true);
    expect(LINEAS.flat().sort((a, b) => a - b)).toEqual(HUECOS.map((_, i) => i));
  });
  it("once ternas de tres sin repetir, y mismas con la misma semilla", () => {
    for (let s = 1; s < 200; s++) {
      const ts = ternas(s);
      expect(ts).toHaveLength(11);
      expect(ts.every((t) => t.length === 3)).toBe(true);
      const nombres = ts.flat().map((x) => x.nombre);
      expect(new Set(nombres).size).toBe(33);
    }
    expect(ternas(7)).toEqual(ternas(7));
  });
  it("resultado: media, máxima y mejores", () => {
    const ts = ternas(3);
    const mejor = ts.map((t) => t.reduce((a, b) => (b.media > a.media ? b : a)));
    const r = resultado(mejor, ts);
    expect(r.mejores).toBe(11);
    expect(r.media).toBe(r.maxima);
  });
});
