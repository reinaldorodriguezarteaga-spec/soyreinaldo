import { describe, expect, it } from "vitest";
import { sinQuiniela, termino } from "../termino";

describe("sin «quiniela» en la app", () => {
  it("cambia todas las formas y deja la web igual", () => {
    expect(sinQuiniela("Juega la quiniela gratis")).toBe("Juega la liga de pronósticos gratis");
    expect(sinQuiniela("Mis quinielas")).toBe("Mis ligas de pronósticos");
    expect(sinQuiniela("La Quiniela de los conos 26-27")).toBe("La Liga de pronósticos de los conos 26-27");
    expect(sinQuiniela("🏆 QUINIELA")).toBe("🏆 LIGA DE PRONÓSTICOS");
    expect(termino("Elige tu quiniela", false)).toBe("Elige tu quiniela");
  });
});
