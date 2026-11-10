import { describe, expect, it } from "vitest";
import { letraBase, letrasDe } from "../ahorcado-comun";

describe("Ahorcado: letras", () => {
  it("las tildes cuentan como la letra sin tilde; la Ñ es aparte", () => {
    expect(letraBase("é")).toBe("E");
    expect(letraBase("ć")).toBe("C");
    expect(letraBase("ç")).toBe("C");
    expect(letraBase("ñ")).toBe("Ñ");
    expect(letraBase("ø")).toBe("O");
  });

  it("espacios, guiones y apóstrofos no se adivinan", () => {
    expect(letraBase(" ")).toBeNull();
    expect(letraBase("-")).toBeNull();
    expect(letraBase("'")).toBeNull();
  });

  it("letras distintas de un nombre", () => {
    expect([...letrasDe("Luka Modrić")].sort().join("")).toBe("ACDIKLMORU");
    expect([...letrasDe("Trent Alexander-Arnold")].sort().join("")).toBe("ADELNORTX");
    expect(letrasDe("Íñigo").has("Ñ")).toBe(true);
  });
});
