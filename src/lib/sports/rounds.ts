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
  if (/Round of 32/i.test(round)) return { order: 900, label: "Dieciseisavos" };
  if (/Round of 16/i.test(round)) return { order: 901, label: "Octavos" };
  if (/Quarter/i.test(round)) return { order: 902, label: "Cuartos" };
  if (/Semi/i.test(round)) return { order: 903, label: "Semis" };
  if (/3rd Place/i.test(round)) return { order: 904, label: "3er puesto" };
  if (/^Finals?$/i.test(round.trim())) return { order: 905, label: "Final" };
  return { order: 999, label: round };
}
