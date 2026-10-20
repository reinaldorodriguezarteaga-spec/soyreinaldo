import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { codificar, estadoInicial } from "../estado";

const { equipos, plantilla } = vi.hoisted(() => ({ equipos: vi.fn(), plantilla: vi.fn() }));
vi.mock("../equipos-vista-previa", () => ({ equiposVistaPrevia: equipos }));
vi.mock("@/lib/sports/api-football", () => ({ getTeamSquad: plantilla }));
const { GET } = await import("@/app/pizarra/imagen/route");

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

async function comprobarPng(url: string) {
  // El código JSX de Next se transforma con React en este entorno de pruebas.
  vi.stubGlobal("React", React);
  const r = await GET(new Request(url));
  expect(r.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=86400");
  expect(r.headers.get("Content-Type")).toBe("image/png");
  const bytes = new Uint8Array(await r.arrayBuffer());
  expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const medidas = new DataView(bytes.buffer);
  expect([medidas.getUint32(16), medidas.getUint32(20)]).toEqual([1200, 630]);
}

describe("imagen compartida de la pizarra", () => {
  it.each(["basura", "a".repeat(12001), ""])("estado inválido: campo genérico sin llamadas (%#)", async (p) => {
    await comprobarPng(`https://ejemplo.com/pizarra/imagen?local=999&visitante=888&p=${p}`);
    expect(equipos).not.toHaveBeenCalled();
    expect(plantilla).not.toHaveBeenCalled();
  });

  it("equipos ajenos: no pide plantillas", async () => {
    equipos.mockResolvedValue(null);
    await comprobarPng(`https://ejemplo.com/pizarra/imagen?p=${codificar(estadoInicial())}`);
    expect(plantilla).not.toHaveBeenCalled();
  });

  it("renderiza colores, jugadores, zonas, flechas y balón sin errores de Satori", async () => {
    equipos.mockResolvedValue({ local: { id: 1, name: "Local" }, visitante: { id: 2, name: "Visitante" } });
    plantilla.mockResolvedValue([{ id: 10, name: "Dani Olmo", number: 20 }]);
    const e = estadoInicial();
    e.once.local[3] = 10;
    e.movidos["local:3"] = { x: 0.6, y: 0.3 };
    e.balon = { x: 0.5, y: 0.5 };
    e.zonas = [{ a: { x: 0.2, y: 0.2 }, b: { x: 0.4, y: 0.6 }, color: "#facc15" }];
    e.flechas = ["pase", "carrera"].map((tipo) => ({ a: { x: 0.1, y: 0.1 }, b: { x: 0.7, y: 0.7 }, tipo: tipo as "pase" | "carrera" }));
    const query = new URLSearchParams({ local: "1", visitante: "2", partido: "3", p: codificar(e) });
    await comprobarPng(`https://ejemplo.com/pizarra/imagen?${query}`);
    expect(equipos).toHaveBeenCalledWith("1", "2", "3");
    expect(plantilla.mock.calls).toEqual([[1], [2]]);
  });
});
