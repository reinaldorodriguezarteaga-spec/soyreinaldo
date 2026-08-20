import { describe, expect, it } from "vitest";
import { puntosPronostico, BAREMO_POR_DEFECTO } from "../scoring";

describe("puntos de un pronóstico", () => {
  it("da los puntos de exacto cuando clava el marcador", () => {
    expect(puntosPronostico({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(3);
  });

  it("da los puntos de acierto cuando falla el marcador pero acierta el ganador", () => {
    expect(puntosPronostico({ home: 3, away: 1 }, { home: 2, away: 0 })).toBe(1);
  });

  it("no da nada cuando falla el ganador", () => {
    expect(puntosPronostico({ home: 2, away: 1 }, { home: 0, away: 1 })).toBe(0);
  });

  it("trata el empate como un resultado más", () => {
    // Empate acertado sin clavar el marcador.
    expect(puntosPronostico({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe(1);
    // Empate clavado.
    expect(puntosPronostico({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(3);
    // Pronosticó empate y ganó alguien.
    expect(puntosPronostico({ home: 1, away: 1 }, { home: 2, away: 1 })).toBe(0);
  });

  it("respeta el baremo propio de cada liga", () => {
    const baremo = { exacto: 5, acierto: 2 };
    expect(puntosPronostico({ home: 2, away: 1 }, { home: 2, away: 1 }, baremo)).toBe(5);
    expect(puntosPronostico({ home: 4, away: 1 }, { home: 2, away: 1 }, baremo)).toBe(2);
    expect(puntosPronostico({ home: 0, away: 1 }, { home: 2, away: 1 }, baremo)).toBe(0);
  });

  it("permite un baremo a cero sin romperse", () => {
    const baremo = { exacto: 0, acierto: 0 };
    expect(puntosPronostico({ home: 1, away: 0 }, { home: 1, away: 0 }, baremo)).toBe(0);
  });

  it("el baremo por defecto es 3 y 1, como la quiniela general", () => {
    expect(BAREMO_POR_DEFECTO).toEqual({ exacto: 3, acierto: 1 });
  });
});
