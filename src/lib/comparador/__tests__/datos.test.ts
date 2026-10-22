import { describe, expect, it } from "vitest";
import type { EstadisticaJugadorApi } from "@/lib/sports/api-football";
import { competiciones, filas, formatear, sinDuplicados, sumar } from "../datos";

const est = (liga: string, id: number | null, o: Partial<{ ap: number; min: number; g: number; a: number | null; r: string | null }>): EstadisticaJugadorApi => ({
  team: { id: 1, name: "X", logo: null },
  league: { id, name: liga, logo: null, season: 2014 },
  games: { appearences: o.ap ?? 0, lineups: o.ap ?? 0, minutes: o.min ?? 0, rating: o.r ?? null },
  goals: { total: o.g ?? 0, assists: o.a ?? null, conceded: null, saves: null },
  shots: { total: null, on: null },
  passes: { total: null, key: null, accuracy: null },
  dribbles: { attempts: null, success: null },
  duels: { total: null, won: null },
  tackles: { total: null, blocks: null, interceptions: null },
  fouls: { drawn: null, committed: null },
  cards: { yellow: 1, yellowred: 0, red: 0 },
  penalty: { scored: null, missed: null },
});

describe("comparador", () => {
  const stats = [
    est("La Liga", 140, { ap: 38, min: 3374, g: 43, a: 18, r: "8.0" }),
    est("UEFA Champions League", 2, { ap: 13, min: 1146, g: 10, a: null, r: "7.0" }),
    est("Club Friendlies", null, { ap: 1, min: 60, g: 5 }),
  ];
  it("suma sin amistosos y respeta los nulos", () => {
    const t = sumar(stats);
    expect(t.partidos).toBe(51);
    expect(t.goles).toBe(53);
    expect(t.asistencias).toBe(18);
    expect(t.tiros).toBeNull();
    expect(t.valoracion).toBeCloseTo((8 * 3374 + 7 * 1146) / 4520, 2);
  });
  it("filtra por competición", () => {
    expect(sumar(stats, "2").goles).toBe(10);
    expect(competiciones(stats).map((c) => c.clave)).toEqual(["140", "2"]);
  });
  it("filas: esconde las vacías y calcula ratios", () => {
    const f = filas(sumar(stats), sumar(stats, "140"));
    expect(f.find((x) => x.etiqueta === "Tiros")).toBeUndefined();
    expect(f.find((x) => x.etiqueta === "Goles por partido")!.b).toBeCloseTo(43 / 38, 5);
    expect(formatear(1.1315, "decimal")).toBe("1,13");
    expect(formatear(null)).toBe("—");
  });

  it("quita las filas repetidas del API (se queda la que tiene id) y respeta las de 1-2 partidos", () => {
    const liga = est("Pro League", 307, { ap: 16, min: 1400, g: 14 });
    const copiaSinId = est("King's Cup", null, { ap: 16, min: 1400, g: 14 });
    const otraCopia = est("King's Cup", null, { ap: 16, min: 1400, g: 14 });
    const supercopa1 = est("Super Cup", 826, { ap: 1, min: 90, g: 0 });
    const supercopa2 = est("Super Cup", 826, { ap: 1, min: 90, g: 0 });
    const limpio = sinDuplicados([copiaSinId, liga, otraCopia, supercopa1, supercopa2]);
    expect(limpio).toEqual([liga, supercopa1, supercopa2]);
    expect(sumar(limpio).goles).toBe(14);
  });

  it("fuera la copia sin id de una competición que ya está, y las supercopas imposibles", () => {
    const copa = est("King's Cup", 504, { ap: 4, min: 300, g: 3 });
    const fantasma = est("King's Cup", null, { ap: 16, min: 1400, g: 14 });
    const superMal = est("Super Cup", 826, { ap: 31, min: 2700, g: 35 });
    expect(sinDuplicados([copa, fantasma, superMal])).toEqual([copa]);
  });
});
