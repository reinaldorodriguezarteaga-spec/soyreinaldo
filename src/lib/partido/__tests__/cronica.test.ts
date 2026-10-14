import { describe, expect, it } from "vitest";
import { textoCronica, type DatosCronica, type GolCronica } from "../cronica";

const gol = (minuto: number, equipoId: number, jugador: string, tipo = "Normal Goal"): GolCronica => ({
  minuto,
  equipoId,
  jugador,
  tipo,
});

const base: DatosCronica = {
  competicion: "LaLiga",
  ronda: "Jornada 8",
  local: { id: 529, nombre: "Barcelona" },
  visitante: { id: 546, nombre: "Getafe" },
  golesLocal: 3,
  golesVisitante: 0,
  // Desordenados a propósito: la crónica los ordena por minuto.
  goles: [gol(73, 529, "Koundé"), gol(2, 529, "Gordon"), gol(30, 529, "Gabriel Jesus", "Penalty")],
  expulsiones: [],
  posesion: [83, 17],
  tiros: [23, 4],
  tirosPuerta: [8, 1],
  xg: [1.98, 0.16],
  mejor: { nombre: "Gordon", equipoId: 529, nota: 8.2 },
};

describe("crónica automática", () => {
  it("goleada con dominio total: titular, marcador de cada gol y 'dominó'", () => {
    expect(textoCronica(base)).toEqual([
      "Barcelona goleó 3-0 a Getafe en la jornada 8 de LaLiga.",
      "Los goles: 1-0 Gordon (2'), 2-0 Gabriel Jesus (30', de penalti) y 3-0 Koundé (73').",
      "Barcelona dominó: tuvo más el balón (83%), tiró más (23 por 4, 8 a puerta por 1) y generó más peligro (1,98 de xG por 0,16).",
      "El mejor del partido, según las notas: Gordon (Barcelona), con un 8,2.",
    ]);
  });

  it("remontada a domicilio con gol decisivo al final y doblete", () => {
    const t = textoCronica({
      competicion: "Champions League",
      ronda: "Jornada 2",
      local: { id: 497, nombre: "AS Roma" },
      visitante: { id: 541, nombre: "Real Madrid" },
      golesLocal: 3,
      golesVisitante: 4,
      goles: [
        gol(20, 497, "de Roon"),
        gol(25, 541, "Mbappé"),
        gol(51, 497, "Malen"),
        gol(57, 497, "Malen"),
        gol(83, 541, "Espí"),
        gol(85, 541, "Endrick"),
        gol(90, 541, "Rüdiger"),
      ],
      expulsiones: [],
      posesion: [54, 46],
      tiros: [14, 16],
      tirosPuerta: [7, 8],
      xg: [1.51, 1.89],
      mejor: { nombre: "Malen", equipoId: 497, nota: 8.8 },
    });
    expect(t).toEqual([
      "Real Madrid remontó y ganó 3-4 en su visita a AS Roma en la jornada 2 de Champions League, con el gol decisivo de Rüdiger en el 90'.",
      "Los goles: 1-0 de Roon (20'), 1-1 Mbappé (25'), 2-1 Malen (51'), 3-1 Malen (57'), 3-2 Espí (83'), 3-3 Endrick (85') y 3-4 Rüdiger (90'). Malen firmó un doblete.",
      "AS Roma tuvo más el balón (54%), pero Real Madrid tiró más (16 por 14, 8 a puerta por 7) y generó más peligro (1,89 de xG por 1,51).",
      "El mejor del partido, según las notas: Malen (AS Roma), con un 8,8.",
    ]);
  });

  it("goleada a domicilio con triplete y doblete", () => {
    const t = textoCronica({
      ...base,
      competicion: "Champions League",
      ronda: "Jornada 2",
      local: { id: 1, nombre: "Lask Linz" },
      visitante: { id: 40, nombre: "Liverpool" },
      golesLocal: 3,
      golesVisitante: 6,
      goles: [
        gol(22, 40, "Araujo"),
        gol(24, 40, "Barcola"),
        gol(37, 40, "Barcola"),
        gol(51, 40, "Frimpong"),
        gol(63, 1, "Ljubicic"),
        gol(66, 40, "Barcola"),
        gol(72, 40, "Koumas"),
        gol(74, 1, "Flecker"),
        gol(77, 1, "Flecker"),
      ],
      posesion: null,
      tiros: null,
      xg: null,
      mejor: null,
    });
    expect(t[0]).toBe("Liverpool goleó 3-6 a domicilio a Lask Linz en la jornada 2 de Champions League.");
    expect(t[1]).toMatch(/Barcola firmó un triplete y Flecker, un doblete\.$/);
  });

  it("victoria visitante con autogol (cuenta para el rival) y expulsión", () => {
    const t = textoCronica({
      ...base,
      ronda: "Octavos",
      competicion: "Champions League",
      golesLocal: 1,
      golesVisitante: 2,
      goles: [gol(10, 546, "Mayoral"), gol(50, 529, "Lewandowski"), gol(80, 546, "Araujo", "Own Goal")],
      expulsiones: [{ minuto: 60, equipoId: 529, jugador: "Araujo" }],
      posesion: null,
      xg: null,
      mejor: null,
    });
    expect(t).toEqual([
      "Getafe ganó 1-2 en su visita a Barcelona en Champions League (Octavos).",
      "Los goles: 0-1 Mayoral (10'), 1-1 Lewandowski (50') y 1-2 Araujo (80', en propia puerta).",
      "Barcelona tiró más (23 por 4, 8 a puerta por 1).",
      "Araujo (Barcelona) fue expulsado en el 60'.",
    ]);
  });

  it("empate sin goles y sin estadísticas", () => {
    expect(
      textoCronica({ ...base, golesLocal: 0, golesVisitante: 0, goles: [], posesion: null, tiros: null, xg: null, mejor: null }),
    ).toEqual(["Barcelona y Getafe empataron 0-0 en la jornada 8 de LaLiga.", "No hubo goles."]);
  });
});
