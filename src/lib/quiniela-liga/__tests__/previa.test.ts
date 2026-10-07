import { describe, expect, it } from "vitest";
import { textoPrevia, type DatosPrevia } from "../previa";

const base: DatosPrevia = {
  local: "Barcelona",
  visitante: "Girona",
  formaLocal: null,
  formaVisitante: null,
  caraACara: null,
  comunidad: null,
  anfitrionHecho: null,
  anfitrionNombre: "Reinaldo",
};

describe("previa automática", () => {
  it("sin datos no dice nada", () => {
    expect(textoPrevia(base)).toEqual([]);
  });

  it("puesto, DG y racha resumida", () => {
    const t = textoPrevia({
      ...base,
      formaLocal: { puesto: 1, dg: 12, racha: ["V", "D", "V", "E", "V"] },
      formaVisitante: { puesto: 14, dg: -3, racha: ["D"] },
    });
    expect(t[0]).toBe(
      "Barcelona llega 1º (+12 de diferencia de goles) y suma 3 victorias, 1 empate y 1 derrota en sus últimos 5.",
    );
    expect(t[1]).toBe("Girona llega 14º (-3 de diferencia de goles) y suma 1 derrota en su último partido.");
  });

  it("racha viva de 3 o más", () => {
    const t = textoPrevia({ ...base, formaLocal: { puesto: null, dg: null, racha: ["D", "V", "V", "V", "V"] } });
    expect(t[0]).toBe("Barcelona encadena 4 victorias seguidas.");
    const e = textoPrevia({ ...base, formaLocal: { puesto: 5, dg: 0, racha: ["E", "E", "E"] } });
    expect(e[0]).toContain("encadena 3 empates seguidos");
  });

  it("cara a cara, comunidad y anfitrión", () => {
    const t = textoPrevia({
      ...base,
      caraACara: { fecha: "2026-03-15T20:00:00Z", local: "Girona", visitante: "Barcelona", golesLocal: 2, golesVisitante: 4 },
      comunidad: { total: 20, local: 13, empate: 4, visitante: 3 },
      anfitrionHecho: true,
    });
    expect(t).toEqual([
      "El último cara a cara, en marzo de 2026, terminó Girona 2–4 Barcelona.",
      "En la quiniela, el 65% de la comunidad da ganador a Barcelona.",
      "Reinaldo ya ha dejado su pronóstico: ¿le ganas?",
    ]);
  });

  it("comunidad: empate favorito o dividida", () => {
    expect(textoPrevia({ ...base, comunidad: { total: 10, local: 3, empate: 5, visitante: 2 } })[0]).toBe(
      "En la quiniela, el 50% de la comunidad ve empate.",
    );
    expect(textoPrevia({ ...base, comunidad: { total: 8, local: 4, empate: 0, visitante: 4 } })[0]).toBe(
      "En la quiniela, la comunidad está dividida (8 pronósticos).",
    );
  });
});
