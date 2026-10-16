import { describe, expect, it } from "vitest";
import { ganadorDuelo, tablaDuelos, type Duelo } from "../duelos";

const d = (over: Partial<Duelo>): Duelo => ({
  id: "x",
  matchday: 9,
  retador: "ana",
  retador_nombre: "Ana",
  rival: "luis",
  rival_nombre: "Luis",
  estado: "aceptado",
  pts_retador: 0,
  pts_rival: 0,
  terminada: true,
  empezada: true,
  ...over,
});

describe("duelos", () => {
  it("solo cuentan los aceptados de jornadas terminadas", () => {
    expect(ganadorDuelo(d({ pts_retador: 7, pts_rival: 5 }))).toBe("ana");
    expect(ganadorDuelo(d({ pts_retador: 5, pts_rival: 5 }))).toBe("empate");
    expect(ganadorDuelo(d({ terminada: false, pts_retador: 9 }))).toBeNull();
    expect(ganadorDuelo(d({ estado: "pendiente", pts_retador: 9 }))).toBeNull();
    expect(ganadorDuelo(d({ estado: "rechazado", pts_retador: 9 }))).toBeNull();
  });

  it("la tabla ordena por ganados y luego por diferencia", () => {
    const t = tablaDuelos([
      d({ pts_retador: 7, pts_rival: 5 }),
      d({ matchday: 10, pts_retador: 2, pts_rival: 6 }),
      d({ matchday: 10, retador: "eva", retador_nombre: "Eva", rival: "ana", rival_nombre: "Ana", pts_retador: 9, pts_rival: 1 }),
    ]);
    expect(t.map((f) => [f.nombre, f.ganados, f.perdidos])).toEqual([
      ["Eva", 1, 0],
      ["Luis", 1, 1],
      ["Ana", 1, 2],
    ]);
  });
});
