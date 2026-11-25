import { describe, expect, it } from "vitest";
import { mismoNombre } from "../tikitaka";

describe("mismoNombre", () => {
  it("reconoce el nombre de la API frente al conocido", () => {
    expect(mismoNombre("Z. Ibrahimović", "Zlatan Ibrahimović")).toBe(true);
    expect(mismoNombre("J. Koundé", "Jules Koundé")).toBe(true);
    expect(mismoNombre("Sergio Ramos", "sergio ramos")).toBe(true);
  });
  it("no confunde a jugadores distintos", () => {
    expect(mismoNombre("Bernardo Silva", "David Silva")).toBe(false);
    expect(mismoNombre("Pedri", "Pedro")).toBe(false);
    expect(mismoNombre("Kaká", "Ibrahimović")).toBe(false);
  });
});
