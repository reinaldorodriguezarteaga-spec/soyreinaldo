import { describe, expect, it } from "vitest";
import { minutoDePronostico, resolver } from "../siguiente-gol";

describe("siguiente gol", () => {
  const goles = [
    { minuto: 20, equipo: "local" as const },
    { minuto: 61, equipo: "visitante" as const },
  ];

  it("cuenta el primer gol con margen tras el pronóstico", () => {
    expect(resolver(10, goles, false)).toBe("local");
    expect(resolver(30, goles, false)).toBe("visitante");
  });

  it("un gol pegado al pronóstico no cuenta (el directo va con retraso)", () => {
    expect(resolver(19, goles, false)).toBe("visitante");
    expect(resolver(18, goles, false)).toBe("local");
  });

  it("sin gol: pendiente en juego, «nadie» al final", () => {
    expect(resolver(70, goles, false)).toBeNull();
    expect(resolver(70, goles, true)).toBe("nadie");
  });

  it("en el descanso vale cualquier gol de la segunda parte", () => {
    const m = minutoDePronostico("HT", 45)!;
    expect(resolver(m, [{ minuto: 46, equipo: "local" }], false)).toBe("local");
    expect(minutoDePronostico("NS", null)).toBeNull();
    expect(minutoDePronostico("2H", 67)).toBe(67);
  });
});
