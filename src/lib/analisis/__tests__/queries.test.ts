import { beforeEach, describe, expect, it, vi } from "vitest";

const { cliente, respuestas, rangos, seleccionados } = vi.hoisted(() => ({
  cliente: vi.fn(), respuestas: [] as unknown[], rangos: [] as number[][], seleccionados: [] as string[][],
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: cliente }));
import { porEquipo } from "../queries";

beforeEach(() => {
  respuestas.length = rangos.length = seleccionados.length = 0;
  const query = {
    select: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn((_col: string, ids: string[]) => { seleccionados.push(ids); return query; }),
    range: vi.fn((a: number, b: number) => { rangos.push([a, b]); return Promise.resolve(respuestas.shift()); }),
    returns: vi.fn(() => Promise.resolve(respuestas.shift())),
  };
  cliente.mockResolvedValue({ from: () => query });
});

describe("consulta de análisis por equipo", () => {
  it("busca más allá de los cien últimos sin descargar sus cuerpos", async () => {
    const otros = Array.from({ length: 100 }, (_, i) => ({ id: `otro-${i}`, title: "Otro equipo", team_id: null, fixture_id: null }));
    const vinculado = { id: "vinculado", title: "Crónica", team_id: 10, fixture_id: null };
    respuestas.push({ data: otros }, { data: [vinculado] }, { data: [vinculado] });
    expect(await porEquipo(10, "Barcelona", [])).toEqual([vinculado]);
    expect(rangos).toEqual([[0, 99], [100, 199]]);
    expect(seleccionados).toEqual([["vinculado"]]);
  });
  it("para al encontrar tres y no pide cuerpos si no hay coincidencias", async () => {
    respuestas.push({ data: [] });
    expect(await porEquipo(10, "Barcelona", [])).toEqual([]);
    expect(seleccionados).toEqual([]);
    const articulos = Array.from({ length: 100 }, (_, i) => ({ id: String(i), title: "El Barça", team_id: null, fixture_id: null }));
    respuestas.push({ data: articulos }, { data: articulos.slice(0, 3) });
    expect(await porEquipo(10, "Barcelona", [])).toHaveLength(3);
    expect(seleccionados).toEqual([["0", "1", "2"]]);
  });
  it("propaga fallos para que la ficha pueda ocultar el bloque sin romperse", async () => {
    respuestas.push({ data: null, error: new Error("No disponible") });
    await expect(porEquipo(10, "Barcelona", [])).rejects.toThrow("No disponible");
  });
});
