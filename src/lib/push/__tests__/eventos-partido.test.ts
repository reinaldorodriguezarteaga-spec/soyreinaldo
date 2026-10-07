import { describe, expect, it } from "vitest";
import { eventoPartido } from "../eventos-partido";

describe("eventoPartido", () => {
  it("avisa del inicio solo al pasar de sin empezar a primera parte", () => {
    expect(eventoPartido("NS", "1H")).toBe("inicio");
    expect(eventoPartido(null, "1H")).toBe("inicio");
    expect(eventoPartido("1H", "1H")).toBeNull();
    expect(eventoPartido("NS", "2H")).toBeNull(); // pillado tarde: no "empieza"
  });

  it("avisa del final una sola vez", () => {
    expect(eventoPartido("2H", "FT")).toBe("final");
    expect(eventoPartido("ET", "AET")).toBe("final");
    expect(eventoPartido("P", "PEN")).toBe("final");
    expect(eventoPartido("FT", "FT")).toBeNull();
  });

  it("nada para cambios intermedios", () => {
    expect(eventoPartido("1H", "HT")).toBeNull();
    expect(eventoPartido("HT", "2H")).toBeNull();
    expect(eventoPartido("NS", "PST")).toBeNull();
  });
});
