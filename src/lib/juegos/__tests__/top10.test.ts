import { describe, expect, it } from "vitest";
import { acierta, aliasDe } from "../top10-comun";

const messi = { n: "L. Messi", f: "Lionel Andrés", l: "Messi Cuccittini", p: "Argentina", b: "ar" };
const etoo = { n: "Samuel Eto'o Fils", f: "Samuel", l: "Eto'o Fils", p: "Cameroon", b: "cm" };
const guti = { n: "Jose Maria Gutierrez Hernandez", f: "José María", l: "Gutiérrez Hernández", p: "Spain", b: "es" };
const vanPersie = { n: "R. van Persie", f: "Robin", l: "van Persie", p: "Netherlands", b: "nl" };

describe("Top 10: reconocer nombres", () => {
  it("vale el apellido, sin tildes ni mayúsculas", () => {
    expect(acierta("Messi", aliasDe(messi))).toBe(true);
    expect(acierta("messi", aliasDe(messi))).toBe(true);
    expect(acierta("Lionel Messi", aliasDe(messi))).toBe(true); // «L. Messi» con el nombre de pila
    expect(acierta("Leo Messi", aliasDe(messi))).toBe(false); // el apodo, solo con alias
    expect(acierta("Leo Messi", aliasDe(messi, { alias: ["Leo Messi"] }))).toBe(true);
  });

  it("apóstrofos y apellidos compuestos", () => {
    expect(acierta("Eto'o", aliasDe(etoo))).toBe(true);
    expect(acierta("etoo", aliasDe(etoo))).toBe(true);
    expect(acierta("van persie", aliasDe(vanPersie))).toBe(true);
    expect(acierta("persie", aliasDe(vanPersie))).toBe(true);
  });

  it("el nombre conocido manda (Guti)", () => {
    expect(acierta("Guti", aliasDe(guti, { nombre: "Guti" }))).toBe(true);
    expect(acierta("gutierrez", aliasDe(guti))).toBe(true);
  });

  it("no acierta con trozos cortos ni palabras vacías", () => {
    expect(acierta("me", aliasDe(messi))).toBe(false);
    expect(acierta("van", aliasDe(vanPersie))).toBe(false);
    expect(acierta("mes", aliasDe(messi))).toBe(false);
  });
});
