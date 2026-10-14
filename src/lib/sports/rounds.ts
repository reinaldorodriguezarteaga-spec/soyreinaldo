/**
 * Orden + etiqueta corta de una ronda. Sin config por competición (LaLiga
 * solo tiene jornadas de liga regular) — cubre el patrón habitual de
 * API-Football ("Regular Season - N") y, si en el futuro una competición KO
 * (p. ej. Champions) usa otro formato, muestra el string tal cual en vez de
 * fallar.
 */
export function roundMeta(round: string): { order: number; label: string } {
  const g = round.match(/Regular Season\s*-\s*(\d+)/i);
  if (g) return { order: Number(g[1]), label: `Jornada ${g[1]}` };
  // Fase de grupos y fase de liga (Champions de Europa: "League Stage";
  // Champions asiática: "League Phase").
  const g2 = round.match(/(?:Group Stage|League Stage|League Phase)\s*-\s*(\d+)/i);
  if (g2) return { order: Number(g2[1]), label: `Jornada ${g2[1]}` };
  // Rondas previas (Champions, Europa, Libertadores…): antes de la fase de
  // liga o de grupos. El orden fino lo da la fecha (FinalizadosView).
  const previa = round.match(/(\d+)(?:st|nd|rd|th)\s+(?:Qualifying|Preliminary) Round|(?:Qualification|Preliminary) Round\s*(\d+)/i);
  if (previa) {
    const n = Number(previa[1] ?? previa[2]);
    return { order: -100 + n, label: `Previa ${n}` };
  }
  if (/Preliminary Round|Qualifying Round|Qualification Round|^\d+(?:st|nd|rd|th) Round$/i.test(round)) {
    return { order: -50, label: "Ronda previa" };
  }
  if (/Play-?offs?/i.test(round)) return { order: /knockout/i.test(round) ? 899 : -10, label: "Playoff" };
  if (/Round of 32/i.test(round)) return { order: 900, label: "Dieciseisavos" };
  if (/Round of 16/i.test(round)) return { order: 901, label: "Octavos" };
  if (/Quarter/i.test(round)) return { order: 902, label: "Cuartos" };
  if (/Semi/i.test(round)) return { order: 903, label: "Semis" };
  if (/3rd Place/i.test(round)) return { order: 904, label: "3er puesto" };
  if (/^Finals?$/i.test(round.trim())) return { order: 905, label: "Final" };
  return { order: 999, label: round };
}

/** Etiqueta corta para la tira de rondas: "J2" en las jornadas; el resto,
 * como `roundMeta` ("Previa 1", "Octavos"). */
export function roundChip(round: string): string {
  const { label } = roundMeta(round);
  const j = label.match(/^Jornada (\d+)$/);
  return j ? `J${j[1]}` : label;
}
