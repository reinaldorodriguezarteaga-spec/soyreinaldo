/**
 * Quiniela de la Champions (21-oct, migración 084): sus partidos van en
 * lq_matches con competition = 'champions' y counts_for_scoring = false.
 */

export const COMPETICION_CHAMPIONS = "champions";
export const TEMPORADA_CHAMPIONS = 2026;

/** Jornadas de la quiniela: 1-8 fase liga y luego las eliminatorias. */
export const JORNADAS_CHAMPIONS: { n: number; corto: string; largo: string }[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ n: i + 1, corto: `J${i + 1}`, largo: `Jornada ${i + 1}` })),
  { n: 9, corto: "Playoff", largo: "Playoff de eliminatorias" },
  { n: 10, corto: "Octavos", largo: "Octavos de final" },
  { n: 11, corto: "Cuartos", largo: "Cuartos de final" },
  { n: 12, corto: "Semis", largo: "Semifinales" },
  { n: 13, corto: "Final", largo: "Final" },
];

/** Jornada según la ronda del API; null = ronda previa (las clasificatorias
 * de verano no entran). */
export function jornadaChampions(round: string): number | null {
  const liga = /^League Stage - (\d+)$/.exec(round);
  if (liga) return Number(liga[1]);
  const KO: Record<string, number> = {
    "Knockout Round Play-offs": 9,
    "Round of 16": 10,
    "Quarter-finals": 11,
    "Semi-finals": 12,
    Final: 13,
  };
  return KO[round] ?? null;
}
