import { describe, expect, it } from "vitest";
import { textoCronica, type DatosCronica } from "../cronica";

const base: DatosCronica = {
  competicion: "LaLiga",
  ronda: "Jornada 8",
  local: { id: 529, nombre: "Barcelona" },
  visitante: { id: 546, nombre: "Getafe" },
  golesLocal: 3,
  golesVisitante: 0,
  goles: [
    { minuto: 73, equipoId: 529, jugador: "Jules Koundé", tipo: "Normal Goal" },
    { minuto: 2, equipoId: 529, jugador: "Anthony Gordon", tipo: "Normal Goal" },
    { minuto: 30, equipoId: 529, jugador: "Gabriel Jesus", tipo: "Penalty" },
  ],
  expulsiones: [],
  posesion: [83, 17],
  tiros: [23, 4],
  tirosPuerta: [8, 1],
  xg: [1.98, 0.16],
  mejor: { nombre: "Anthony Gordon", equipoId: 529, nota: 8.2 },
};

describe("crónica automática", () => {
  it("el Barça–Getafe de la jornada 8", () => {
    expect(textoCronica(base)).toEqual([
      "Barcelona venció 3-0 a Getafe en la jornada 8 de LaLiga.",
      "Marcaron por Barcelona, Anthony Gordon (2'), Gabriel Jesus (30', de penalti) y Jules Koundé (73').",
      "Barcelona tuvo el 83% de la posesión y disparó 23 veces frente a 4 (8 a puerta, por 1 del rival).",
      "En goles esperados (xG), 1,98 para Barcelona y 0,16 para Getafe.",
      "El mejor valorado fue Anthony Gordon (Barcelona), con un 8,2.",
    ]);
  });

  it("victoria visitante, goles de los dos y expulsión", () => {
    const t = textoCronica({
      ...base,
      ronda: "Round of 16",
      competicion: "Champions League",
      golesLocal: 1,
      golesVisitante: 2,
      goles: [
        { minuto: 10, equipoId: 546, jugador: "Mayoral", tipo: "Normal Goal" },
        // autogol de Araujo: cuenta para Getafe (equipoId = el beneficiado)
        { minuto: 50, equipoId: 546, jugador: "Araujo", tipo: "Own Goal" },
        { minuto: 80, equipoId: 546, jugador: "Uche", tipo: "Normal Goal" },
      ],
      expulsiones: [{ minuto: 60, equipoId: 529, jugador: "Araujo" }],
      posesion: null,
      xg: null,
      mejor: null,
    });
    expect(t).toEqual([
      "Getafe ganó 1-2 en su visita a Barcelona en Champions League (Round of 16).",
      "Marcaron por Getafe, Mayoral (10'), Araujo (50', en propia puerta) y Uche (80').",
      "Araujo (Barcelona) fue expulsado en el minuto 60.",
    ]);
  });

  it("empate sin goles y sin estadísticas", () => {
    expect(
      textoCronica({ ...base, golesLocal: 0, golesVisitante: 0, goles: [], posesion: null, tiros: null, xg: null, mejor: null }),
    ).toEqual(["Barcelona y Getafe empataron 0-0 en la jornada 8 de LaLiga.", "No hubo goles."]);
  });
});
