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

/**
 * Estructura del cuadro de Champions League bajo el formato nuevo de la
 * UEFA (desde 2024-25): tras la fase de liga (36 equipos, tabla única, sin
 * grupos) hay una ronda extra "Round of 32" antes de octavos. Verificado
 * contra `/fixtures?league=2&season=2025` real — strings de ronda exactos:
 * "1st/2nd/3rd Qualifying Round", "Play-offs", "League Stage - 1..8",
 * "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final".
 */
const CHAMPIONS_LEAGUE_KO_STRUCTURE: KoStructureEntry[] = [
  { label: "Dieciseisavos", re: /Round of 32/i, slots: 16 },
  { label: "Octavos", re: /Round of 16/i, slots: 8 },
  { label: "Cuartos", re: /Quarter/i, slots: 4 },
  { label: "Semifinales", re: /Semi/i, slots: 2 },
  { label: "Final", re: /^Final$/i, slots: 1 },
];

/**
 * Fase de liga = tabla única de 36 equipos (verificado: `/standings` devuelve
 * un solo array de 36 filas, sin grupos) → standingsMode "table" igual que
 * LaLiga, no "groups". Las eliminatorias van aparte en `koStructure`.
 */
export const CHAMPIONS_LEAGUE: Competition = {
  slug: "champions",
  leagueId: 2,
  season: 2025,
  name: "Champions League",
  standingsMode: "table",
  koStructure: CHAMPIONS_LEAGUE_KO_STRUCTURE,
};

export const PREMIER_LEAGUE: Competition = {
  slug: "premier",
  leagueId: 39,
  season: 2025,
  name: "Premier League",
  // Verificado: solo "Regular Season - 1..38", sin fase de eliminatorias.
  standingsMode: "table",
};

/**
 * FA Cup y Copa del Rey: puro KO, sin tabla. Verificado contra la API real
 * (season 2025) — ambas tienen muchas rondas previas de clasificación con
 * clubes no profesionales (Extra Preliminary/Preliminary/1st-3rd Qualifying,
 * con repeticiones) antes de "Round of 128"/"64" — se ignoran a propósito en
 * el bracket (ruido para el aficionado medio) y se muestra desde "Round of
 * 32", igual que el resto de KO_STRUCTURE del sitio.
 */
const CUP_KO_STRUCTURE: KoStructureEntry[] = [
  { label: "Dieciseisavos", re: /Round of 32/i, slots: 16 },
  { label: "Octavos", re: /Round of 16/i, slots: 8 },
  { label: "Cuartos", re: /Quarter/i, slots: 4 },
  { label: "Semifinales", re: /Semi/i, slots: 2 },
  { label: "Final", re: /^Final$/i, slots: 1 },
];

export const FA_CUP: Competition = {
  slug: "fa-cup",
  leagueId: 45,
  season: 2025,
  name: "FA Cup",
  standingsMode: "none",
  koStructure: CUP_KO_STRUCTURE,
};

export const COPA_DEL_REY: Competition = {
  slug: "copa-del-rey",
  leagueId: 143,
  season: 2025,
  name: "Copa del Rey",
  standingsMode: "none",
  koStructure: CUP_KO_STRUCTURE,
};

/**
 * Supercopa de España: mini-torneo de 4 equipos, solo 3 partidos (2 semis +
 * final) — verificado contra la API real (season 2025, id "Super Cup" 556).
 */
const SUPERCOPA_KO_STRUCTURE: KoStructureEntry[] = [
  { label: "Semifinales", re: /Semi/i, slots: 2 },
  { label: "Final", re: /^Final$/i, slots: 1 },
];

export const SUPERCOPA: Competition = {
  slug: "supercopa",
  leagueId: 556,
  season: 2025,
  name: "Supercopa de España",
  standingsMode: "none",
  koStructure: SUPERCOPA_KO_STRUCTURE,
};

/**
 * Europa League: mismo formato UEFA nuevo que Champions (fase de liga con
 * tabla única, sin grupos, + KO desde "Round of 32"). Verificado contra la
 * API real: /standings da 1 array de 36 filas, mismos strings de ronda que
 * Champions.
 */
export const EUROPA_LEAGUE: Competition = {
  slug: "europa",
  leagueId: 3,
  season: 2025,
  name: "Europa League",
  standingsMode: "table",
  koStructure: CHAMPIONS_LEAGUE_KO_STRUCTURE,
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
 * Competiciones activas del árbol /liga/[slug]. El Mundial NO va en esta
 * lista: queda congelado en /mundial, fuera de este árbol genérico.
 */
export const COMPETITIONS: Competition[] = [
  LALIGA,
  CHAMPIONS_LEAGUE,
  PREMIER_LEAGUE,
  FA_CUP,
  COPA_DEL_REY,
  SUPERCOPA,
  EUROPA_LEAGUE,
];

export const COMPETITIONS_BY_SLUG: Record<string, Competition> = Object.fromEntries(
  COMPETITIONS.map((c) => [c.slug, c]),
);
