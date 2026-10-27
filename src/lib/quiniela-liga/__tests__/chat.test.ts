import { describe, expect, it } from "vitest";
import { filtrarTexto, textoExactos } from "../chat";

describe("chat de la quiniela", () => {
  it("limpia, tapa insultos graves y quita enlaces de fuera", () => {
    expect(filtrarTexto("   ")).toBeNull();
    expect(filtrarTexto("  ¡Vaya golazo!  ")).toBe("¡Vaya golazo!");
    expect(filtrarTexto("eres un subnormal")).toBe("eres un s********");
    expect(filtrarTexto("mira https://estafa.xyz/premio")).toBe("mira [enlace quitado]");
    expect(filtrarTexto("mi quiniela https://www.soyreinaldo.com/quiniela-liga")).toContain("soyreinaldo.com");
    // Las palabrotas de fútbol de siempre se dejan.
    expect(filtrarTexto("qué penalti más tonto, joder")).toBe("qué penalti más tonto, joder");
  });

  it("anuncia los exactos de un partido", () => {
    expect(textoExactos("Barcelona", "Real Madrid", 1, 2, ["Ana"])).toBe("🎯 Exacto en Barcelona 1-2 Real Madrid: Ana. ¡Máquina!");
    expect(textoExactos("Betis", "Celta", 0, 0, ["Ana", "Luis"])).toContain("Ana y Luis. ¡Máquinas!");
    expect(textoExactos("A", "B", 2, 0, ["a", "b", "c", "d", "e"])).toContain("a, b, c y 2 más");
  });
});
