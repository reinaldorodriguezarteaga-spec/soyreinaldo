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

/** Agrupación del nav "Competiciones": por país, salvo las UEFA (sin país,
 * "Internacional"). */
export type CompetitionRegion =
  | "España"
  | "Inglaterra"
  | "Italia"
  | "Francia"
  | "Internacional";

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
  /** Temporadas navegables además de `season` (la actual/por defecto). Por
   * ahora siempre [season - 1] — la temporada recién terminada. */
  archivedSeasons?: number[];
  /** País para agrupar el desplegable "Competiciones" del nav. */
  region: CompetitionRegion;
  /** Si está, en el CALENDARIO DE PORTADA solo salen los partidos donde
   * juegue uno de estos equipos. El hub /liga/[slug] no se toca: allí se ve
   * la competición entera. Sirve para las ligas que están por sus equipos
   * grandes, no por sí mismas (Ligue 1 → PSG y Lyon, pedido del dueño:
   * "solo juegos del PSG en el calendario del front page"). */
  calendarOnlyTeamIds?: number[];
};

/**
 * Resuelve el `season` efectivo a partir de un searchParam sin confiar en él
 * ciegamente: solo se acepta si coincide con `competition.season` o está en
 * `competition.archivedSeasons`; cualquier otro valor (vacío, no numérico,
 * manipulado, o de otra competición) cae de vuelta a la season por defecto.
 */
export function resolveSeason(
  competition: Competition,
  raw: string | undefined,
): number {
  if (!raw) return competition.season;
  const n = Number(raw);
  if (!Number.isFinite(n)) return competition.season;
  if (n === competition.season) return n;
  if (competition.archivedSeasons?.includes(n)) return n;
  return competition.season;
}

export const LALIGA: Competition = {
  slug: "laliga",
  leagueId: 140,
  // 2025-26 (season 2025) terminó hace ~2 meses (0 fixtures restantes,
  // verificado). 2026-27 (season 2026) ya tiene calendario real publicado,
  // arranca 15-ago — se usa esa por delante en vez de la temporada muerta.
  season: 2026,
  name: "LaLiga",
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "España",
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
  // 2025-26 (season 2025) terminó — la 2026-27 (season 2026) YA empezó a
  // jugarse (2ª ronda clasificatoria arranca 28-jul, verificado).
  season: 2026,
  name: "Champions League",
  standingsMode: "table",
  koStructure: CHAMPIONS_LEAGUE_KO_STRUCTURE,
  archivedSeasons: [2025],
  region: "Internacional",
};

export const PREMIER_LEAGUE: Competition = {
  slug: "premier",
  leagueId: 39,
  // 2025-26 (season 2025) terminó. 2026-27 (season 2026) arranca 21-ago,
  // calendario ya publicado — verificado.
  season: 2026,
  name: "Premier League",
  // Solo "Regular Season - 1..38", sin fase de eliminatorias.
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "Inglaterra",
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

/**
 * FA Cup y Copa del Rey se quedan en season 2025 (la edición que acaba de
 * terminar) A PROPÓSITO: verificado que season 2026 todavía tiene 0
 * fixtures (las copas domésticas empiezan más tarde en el año que las
 * ligas/competiciones UEFA — su calendario 2026-27 aún no está publicado).
 * Mostrar el cuadro recién acabado es más útil que una página vacía;
 * revisar y subir a 2026 cuando la API publique su calendario.
 */
export const FA_CUP: Competition = {
  slug: "fa-cup",
  leagueId: 45,
  season: 2025,
  name: "FA Cup",
  standingsMode: "none",
  koStructure: CUP_KO_STRUCTURE,
  archivedSeasons: [2024],
  region: "Inglaterra",
};

export const COPA_DEL_REY: Competition = {
  slug: "copa-del-rey",
  leagueId: 143,
  season: 2025,
  name: "Copa del Rey",
  standingsMode: "none",
  koStructure: CUP_KO_STRUCTURE,
  archivedSeasons: [2024],
  region: "España",
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
  // season 2026 ya tiene sus semifinales reales programadas (2-feb-2027 —
  // la Supercopa española se juega a mitad de temporada). Verificado.
  season: 2026,
  name: "Supercopa de España",
  standingsMode: "none",
  koStructure: SUPERCOPA_KO_STRUCTURE,
  archivedSeasons: [2025],
  region: "España",
};

/**
 * Europa League: mismo formato UEFA nuevo que Champions (fase de liga con
 * tabla única, sin grupos, + KO desde "Round of 32"). Verificado contra la
 * API real: /standings da 1 array de 36 filas, mismos strings de ronda que
 * Champions. 2026-27 ya arrancó (2ª ronda clasificatoria 23-jul).
 */
export const EUROPA_LEAGUE: Competition = {
  slug: "europa",
  leagueId: 3,
  season: 2026,
  name: "Europa League",
  standingsMode: "table",
  koStructure: CHAMPIONS_LEAGUE_KO_STRUCTURE,
  archivedSeasons: [2025],
  region: "Internacional",
};

/**
 * Conference League: tercera competición UEFA, mismo formato nuevo que
 * Champions/Europa (fase de liga = tabla única de 36, sin grupos; luego KO
 * desde "Round of 32"). Verificado contra la API real (id 848, season 2026):
 * rondas "1st/2nd/3rd Qualifying Round, Playoff round, League Stage 1-6,
 * Round of 32, Round of 16, Quarter-finals, Semi-finals, Final" — 2ª ronda
 * clasificatoria ya arrancó (23-jul).
 */
export const CONFERENCE_LEAGUE: Competition = {
  slug: "conference",
  leagueId: 848,
  season: 2026,
  name: "Conference League",
  standingsMode: "table",
  koStructure: CHAMPIONS_LEAGUE_KO_STRUCTURE,
  archivedSeasons: [2025],
  region: "Internacional",
};

/**
 * Serie A italiana: tabla plana igual que LaLiga/Premier, sin eliminatorias.
 * Verificado (id 135, season 2026): arranca 22-ago, calendario publicado.
 */
export const SERIE_A: Competition = {
  slug: "serie-a",
  leagueId: 135,
  season: 2026,
  name: "Serie A",
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "Italia",
};

/**
 * Ligue 1 francesa: tabla plana, sin eliminatorias. Verificado contra la API
 * (id 61, season 2026 marcada como actual): arrancó el 21-ago-2026, 306
 * partidos publicados y con clasificación disponible.
 *
 * ⚠️ En el CALENDARIO de la portada solo salen PSG y Lyon
 * (`calendarOnlyTeamIds`): la liga entera llenaría la lista de cruces que
 * aquí nadie busca. El hub /liga/ligue-1 sí la muestra completa.
 */
export const LIGUE_1: Competition = {
  slug: "ligue-1",
  leagueId: 61,
  season: 2026,
  name: "Ligue 1",
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "Francia",
  calendarOnlyTeamIds: [85, 80],
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
  region: "Internacional",
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
  CONFERENCE_LEAGUE,
  SERIE_A,
  LIGUE_1,
];

export const COMPETITIONS_BY_SLUG: Record<string, Competition> = Object.fromEntries(
  COMPETITIONS.map((c) => [c.slug, c]),
);

/**
 * `COMPETITIONS` agrupadas por país para el desplegable "Competiciones" del
 * nav (`Header.tsx`) — dentro de cada país, la liga siempre primero (así
 * está ordenado `COMPETITIONS` ya: liga antes que sus copas). El orden de
 * los países es fijo: España, Inglaterra, Italia, y por último Internacional
 * (las UEFA, sin país propio).
 */
const REGION_ORDER: CompetitionRegion[] = [
  "España",
  "Inglaterra",
  "Italia",
  "Francia",
  "Internacional",
];

export const COMPETITION_GROUPS: { region: CompetitionRegion; competitions: Competition[] }[] =
  REGION_ORDER.map((region) => ({
    region,
    competitions: COMPETITIONS.filter((c) => c.region === region),
  })).filter((g) => g.competitions.length > 0);

/**
 * Equipos destacados para la sección de amistosos de pretemporada: en
 * verano, con las ligas paradas, la mayoría de sus próximos partidos son
 * amistosos (liga API-Football "Friendlies Clubs", id 667 — no es una
 * `Competition` normal, así que estos equipos se tratan aparte por id de
 * equipo, no por competición). IDs verificados contra la API real. Lista
 * inicial corta a propósito — fácil de ampliar.
 */
export type FeaturedTeam = {
  id: number;
  name: string;
  /** Slug de la Competition doméstica del equipo, para enlazar su ficha
   * (/liga/[slug]/equipo/[id]) — la ficha de equipo no depende de que el
   * partido en sí sea de esa competición, solo necesita el fixture id.
   * `null` = equipo sin hub natural en el sitio → sus filas del calendario
   * van sin enlace. */
  homeCompetitionSlug: string | null;
};

export const FEATURED_TEAMS: FeaturedTeam[] = [
  { id: 529, name: "Barcelona", homeCompetitionSlug: "laliga" },
  { id: 541, name: "Real Madrid", homeCompetitionSlug: "laliga" },
  { id: 530, name: "Atlético de Madrid", homeCompetitionSlug: "laliga" },
  { id: 33, name: "Manchester United", homeCompetitionSlug: "premier" },
  { id: 50, name: "Manchester City", homeCompetitionSlug: "premier" },
  { id: 40, name: "Liverpool", homeCompetitionSlug: "premier" },
  // Pedido 18-ago: TODOS los partidos de PSG y Lyon en el calendario (ids
  // verificados contra /teams?league=61). Desde el 22-ago la Ligue 1 es una
  // Competition, así que ya tienen hub y sus filas enlazan.
  { id: 85, name: "PSG", homeCompetitionSlug: "ligue-1" },
  { id: 80, name: "Lyon", homeCompetitionSlug: "ligue-1" },
];

/* ---------------------------------------------------------------------- *
 * Ligas/copas EXTRA solo para el calendario de la portada: no tienen hub
 * propio (/liga/[slug]) ni tabla — solo sus próximos partidos, mezclados
 * en la lista cronológica. IDs verificados contra /leagues de API-Football
 * el 18-ago-2026. Cada entrada cuesta 1 llamada por pasada del cron de
 * sports_cache — mantener la lista curada, no "todo lo que exista".
 * ---------------------------------------------------------------------- */

export type CalendarExtraLeague = {
  /** Id de liga en API-Football. */
  leagueId: number;
  /** Season vigente (año de inicio). */
  season: number;
  /** Etiqueta a mostrar como badge en el calendario. */
  name: string;
  /** Si está, solo se muestran partidos donde juegue uno de estos equipos
   * (p. ej. Bundesliga → solo los 4 grandes). */
  onlyTeamIds?: number[];
  /** true → fuera selecciones juveniles (U17/U20/U21...) y femeninas —
   * solo la absoluta. */
  seniorOnly?: boolean;
};

export const CALENDAR_EXTRA_LEAGUES: CalendarExtraLeague[] = [
  // Inglaterra (la Premier y la FA Cup ya están como Competition)
  { leagueId: 48, season: 2026, name: "EFL Cup" },
  { leagueId: 528, season: 2026, name: "Community Shield" },
  // Italia (la Serie A ya está como Competition)
  { leagueId: 137, season: 2026, name: "Coppa Italia" },
  { leagueId: 547, season: 2026, name: "Supercoppa" },
  // Alemania
  // Solo los 4 grandes (pedido 18-ago; ids verificados contra /teams):
  // Bayern 157, Dortmund 165, Leverkusen 168, Leipzig 173.
  { leagueId: 78, season: 2026, name: "Bundesliga", onlyTeamIds: [157, 165, 168, 173] },
  // La copa también solo con los 4 grandes — la 1ª ronda son 32 cruces de
  // clubes de regional que el dueño confundió con "una liga polaca".
  { leagueId: 81, season: 2026, name: "DFB Pokal", onlyTeamIds: [157, 165, 168, 173] },
  // Selecciones (solo las que tienen partidos en el horizonte actual;
  // cuando arranque la próxima edición, añadir aquí con su season:
  // 32/34/31/30/29 = clasif. Mundial por confederación, 960 = clasif.
  // Eurocopa, 4 = Eurocopa, 9 = Copa América)
  { leagueId: 10, season: 2026, name: "Amistoso · Selecciones", seniorOnly: true },
  { leagueId: 5, season: 2026, name: "Nations League" },
];
