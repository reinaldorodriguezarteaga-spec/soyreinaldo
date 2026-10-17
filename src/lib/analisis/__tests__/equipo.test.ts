import { describe, expect, it } from "vitest";
import { esDelEquipo } from "../equipo";
import { nombraEquipo } from "@/lib/sports/menciones";

const equipo = { id: 10, nombre: "Barcelona", partidos: new Set([25]) };
const articulo = { title: "Balance de la jornada", team_id: null, fixture_id: null };

describe("análisis del equipo", () => {
  it("recupera la asignación manual aunque el título no nombre al equipo", () => {
    expect(esDelEquipo({ ...articulo, team_id: 10 }, equipo)).toBe(true);
  });
  it("recupera el análisis del partido para ambos participantes", () => {
    expect(esDelEquipo({ ...articulo, fixture_id: 25 }, equipo)).toBe(true);
    expect(esDelEquipo({ ...articulo, fixture_id: 25 }, { ...equipo, id: 20 })).toBe(true);
  });
  it("reconoce apodos, tildes y plurales en los títulos existentes", () => {
    for (const title of ["El Barça se juega la racha", "Los culés ganan", "Orgullo blaugrana"])
      expect(esDelEquipo({ ...articulo, title }, equipo)).toBe(true);
  });
  it("no convierte una mención incidental en una reasignación manual", () => {
    expect(esDelEquipo({ ...articulo, title: "El Barça y el Madrid", team_id: 20 }, equipo)).toBe(false);
  });
  it("respeta palabras completas y descarta títulos ajenos", () => {
    expect(esDelEquipo({ ...articulo, title: "Barcarrota" }, equipo)).toBe(false);
    expect(esDelEquipo({ ...articulo, title: "Gana el Madrid" }, equipo)).toBe(false);
    expect(nombraEquipo("El Real Madrid gana", "Atlético Madrid")).toBe(false);
    expect(nombraEquipo("El Barça gana", "")).toBe(false);
  });
  it("admite espacios y signos en los nombres compuestos", () => {
    expect(nombraEquipo("Gana la Real  Sociedad", "Real Sociedad")).toBe(true);
  });
});
