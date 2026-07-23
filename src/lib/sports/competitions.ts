/**
 * Config declarativa por competición: liga/season de API-Football, cómo se
 * lee su tabla (plana, por grupos, o inexistente), y su cuadro de
 * eliminatorias si aplica. Sustituye al enfoque de un único `WORLD_CUP`
 * hardcodeado — archivo aparte porque `api-football.ts` ya mezcla cliente
 * API + lógica y no debe seguir creciendo con más constantes de competición.
 *
 * No importa nada de `api-football.ts` a propósito (evita ciclos): es
 * `api-football.ts` quien importa `Competition` de aquí.
 */

export type StandingsMode = "table" | "groups" | "none";

export type KoStructureEntry = { label: string; re: RegExp; slots: number };

export type Competition = {
  /** Usado en las rutas /liga/[slug]/... */
  slug: string;
  /** Id de liga en API-Football. */
  leagueId: number;
  /** Season de API-Football (año de inicio de temporada). */
  season: number;
  name: string;
  standingsMode: StandingsMode;
  /** Solo si tiene fase de eliminatorias. */
  koStructure?: KoStructureEntry[];
};

export const LALIGA: Competition = {
  slug: "laliga",
  leagueId: 140,
  // Temporada actual en API-Football se marca por el año de inicio (2025-26 = 2025).
  season: 2025,
  name: "LaLiga",
  standingsMode: "table",
};

/** Estructura fija del cuadro del Mundial 2026 (48 equipos → KO desde 32avos). */
const WORLD_CUP_KO_STRUCTURE: KoStructureEntry[] = [
  { label: "Dieciseisavos", re: /Round of 32/i, slots: 16 },
  { label: "Octavos", re: /Round of 16/i, slots: 8 },
  { label: "Cuartos", re: /Quarter/i, slots: 4 },
  { label: "Semifinales", re: /Semi/i, slots: 2 },
  { label: "Final", re: /^Final$/i, slots: 1 },
];

/** El Mundial 2026 ya terminó — esta config alimenta la sección congelada /mundial. */
export const WORLD_CUP_2026: Competition = {
  slug: "mundial",
  leagueId: 1,
  season: 2026,
  name: "Mundial 2026",
  standingsMode: "groups",
  koStructure: WORLD_CUP_KO_STRUCTURE,
};

/**
 * Competiciones activas del árbol /liga/[slug]. Empieza solo con LaLiga —
 * Champions League se añade en un PR aparte, tras verificar contra la API
 * real los strings de ronda para su propio KO_STRUCTURE (no adivinar).
 * El Mundial NO va en esta lista: queda congelado en /mundial, fuera de
 * este árbol genérico.
 */
export const COMPETITIONS: Competition[] = [LALIGA];

export const COMPETITIONS_BY_SLUG: Record<string, Competition> = Object.fromEntries(
  COMPETITIONS.map((c) => [c.slug, c]),
);
