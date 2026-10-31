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
  | "México"
  | "Argentina"
  | "Conmebol"
  | "EE. UU. y Canadá"
  | "Concacaf"
  | "Arabia Saudí"
  | "Internacional"
  | "Selecciones";

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
  /** Web oficial de quien organiza la competición. Va en los datos
   * estructurados de cada partido (`organizer.url`) — Search Console lo pidió
   * el 25-ago. Es la web del organizador DE VERDAD, no una página nuestra:
   * decir que la URL de LaLiga es soyreinaldo.com sería falso. Todas
   * comprobadas abriéndolas (uefa.com y rfef.es bloquean peticiones
   * automáticas, así que se verificaron en un navegador real). */
  officialUrl?: string;
  /** Si está, en el CALENDARIO DE PORTADA solo salen los partidos donde
   * juegue uno de estos equipos. El hub /liga/[slug] no se toca: allí se ve
   * la competición entera. Sirve para las ligas que están por sus equipos
   * grandes, no por sí mismas (Ligue 1 → PSG y Lyon, pedido del dueño:
   * "solo juegos del PSG en el calendario del front page"). */
  calendarOnlyTeamIds?: number[];
  /** Temporada de año natural (MLS, Argentina, copas de Concacaf…): el
   * selector la escribe "2026" y no "2026-27". */
  anual?: boolean;
  /** Nombre de la edición cuando el año no lo dice (eliminatorias: "Mundial
   * 2026"). Se usa al avisar de que la edición mostrada ya terminó. */
  edicion?: string;
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

/**
 * Competición de una ruta `/api/sports/*` a partir de `?<slugParam>=` y
 * `?season=`, con la temporada validada por `resolveSeason`. Sin `season`
 * (o con una que no toca) es la competición tal cual; `undefined` si el
 * slug no existe.
 */
export function competitionFromParams(
  sp: URLSearchParams,
  slugParam = "competition",
): Competition | undefined {
  const c = COMPETITIONS_BY_SLUG[sp.get(slugParam) ?? ""];
  if (!c) return undefined;
  const season = resolveSeason(c, sp.get("season") ?? undefined);
  return season === c.season ? c : { ...c, season };
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
  officialUrl: "https://www.laliga.com",
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
  officialUrl: "https://www.uefa.com/uefachampionsleague/",
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
  officialUrl: "https://www.premierleague.com",
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
 * FA Cup y Copa del Rey: edición 2026-27 desde el 9-oct-2026. Hasta entonces
 * se quedaron en 2025 porque la API aún no tenía el calendario nuevo; al
 * publicarlo, seguir en 2025 dejaba el calendario de copas vacío (el cron
 * pedía "próximos partidos" de una edición ya terminada). Las rondas
 * previas (1/128, Qualifying…) salen en el calendario; el cuadro de
 * eliminatorias empieza en dieciseisavos, así que se rellena en enero.
 */
export const FA_CUP: Competition = {
  slug: "fa-cup",
  leagueId: 45,
  season: 2026,
  name: "FA Cup",
  standingsMode: "none",
  koStructure: CUP_KO_STRUCTURE,
  archivedSeasons: [2025, 2024],
  region: "Inglaterra",
  officialUrl: "https://www.thefa.com/competitions/thefacup",
};

export const COPA_DEL_REY: Competition = {
  slug: "copa-del-rey",
  leagueId: 143,
  season: 2026,
  name: "Copa del Rey",
  standingsMode: "none",
  koStructure: CUP_KO_STRUCTURE,
  archivedSeasons: [2025, 2024],
  region: "España",
  officialUrl: "https://www.rfef.es",
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
  officialUrl: "https://www.rfef.es",
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
  officialUrl: "https://www.uefa.com/uefaeuropaleague/",
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
  officialUrl: "https://www.uefa.com/uefaconferenceleague/",
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
  officialUrl: "https://www.legaseriea.it",
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
  officialUrl: "https://www.ligue1.com",
  calendarOnlyTeamIds: [85, 80],
};

/*
 * Ligas de América y Arabia Saudí, y selecciones (13-oct-2026, pedido del
 * dueño: audiencia latinoamericana). Ids, temporadas y forma de la
 * clasificación verificados contra la API ese día. En el calendario de la
 * portada solo salen sus equipos grandes (`calendarOnlyTeamIds`, como la
 * Ligue 1); su página /liga/[slug] enseña la competición entera.
 */

/** Liga MX: season 2026 = Apertura 2026 (jul-nov). Una tabla de 18. */
export const LIGA_MX: Competition = {
  slug: "liga-mx",
  leagueId: 262,
  season: 2026,
  name: "Liga MX",
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "México",
  officialUrl: "https://ligamx.net",
  // América, Chivas, Cruz Azul, Pumas, Tigres, Monterrey
  calendarOnlyTeamIds: [2287, 2278, 2295, 2286, 2279, 2282],
  anual: true,
};

/** Liga Profesional Argentina: season 2026 = Apertura + Clausura, cada uno
 * con dos zonas (4 tablas; se pintan por grupo). */
export const LIGA_ARGENTINA: Competition = {
  slug: "liga-argentina",
  leagueId: 128,
  season: 2026,
  name: "Liga Profesional Argentina",
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "Argentina",
  officialUrl: "https://www.ligaprofesional.ar",
  // Boca, River, Racing, Independiente, San Lorenzo
  calendarOnlyTeamIds: [451, 435, 436, 453, 460],
  anual: true,
};

/**
 * Copa Libertadores (14-oct-2026, pedido del dueño). Verificado contra el
 * API: id 13, season 2026 en curso (fase previa, 8 grupos de 4 —se pintan
 * por grupo— y eliminatorias). Sin filtro en la portada: la competición
 * entera es lo que interesa.
 */
const LIBERTADORES_KO_STRUCTURE: KoStructureEntry[] = [
  { label: "Octavos", re: /Round of 16/i, slots: 8 },
  { label: "Cuartos", re: /Quarter/i, slots: 4 },
  { label: "Semifinales", re: /Semi/i, slots: 2 },
  { label: "Final", re: /^Final$/i, slots: 1 },
];

export const LIBERTADORES: Competition = {
  slug: "libertadores",
  leagueId: 13,
  season: 2026,
  name: "Copa Libertadores",
  standingsMode: "table",
  koStructure: LIBERTADORES_KO_STRUCTURE,
  archivedSeasons: [2025],
  region: "Conmebol",
  officialUrl: "https://www.conmebol.com/libertadores/",
  anual: true,
};

/** MLS: dos conferencias (Este y Oeste), se pintan por grupo. */
export const MLS: Competition = {
  slug: "mls",
  leagueId: 253,
  season: 2026,
  name: "MLS",
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "EE. UU. y Canadá",
  officialUrl: "https://www.mlssoccer.com",
  // Inter Miami, LA Galaxy, LAFC
  calendarOnlyTeamIds: [9568, 1605, 1616],
  anual: true,
};

/*
 * Copas de los equipos de la MLS (13-oct-2026, pedido del dueño). Ids y
 * temporadas verificados contra el API. Son torneos de eliminatorias: sin
 * tabla. Las ya terminadas enseñan su última edición; el vigilante avisa
 * cuando el API publique la siguiente. La Canadian Championship se quitó el
 * 14-oct (decisión del dueño: no interesa a la audiencia).
 */
const MLS_GRANDES = [9568, 1605, 1616]; // Inter Miami, LA Galaxy, LAFC
const MX_GRANDES = [2287, 2278, 2295, 2286, 2279, 2282];

/** US Open Cup (copa de EE. UU.): 2026 en juego hasta el 22-oct. */
export const US_OPEN_CUP: Competition = {
  slug: "us-open-cup",
  leagueId: 257,
  season: 2026,
  name: "US Open Cup",
  standingsMode: "none",
  archivedSeasons: [2025],
  region: "EE. UU. y Canadá",
  officialUrl: "https://www.ussoccer.com/us-open-cup",
  calendarOnlyTeamIds: MLS_GRANDES,
  anual: true,
};

/** Leagues Cup (MLS contra Liga MX): 2026 se jugó del 4-ago al 7-sep. */
export const LEAGUES_CUP: Competition = {
  slug: "leagues-cup",
  leagueId: 772,
  season: 2026,
  name: "Leagues Cup",
  standingsMode: "none",
  archivedSeasons: [2025],
  region: "Concacaf",
  officialUrl: "https://www.leaguescup.com",
  calendarOnlyTeamIds: [...MLS_GRANDES, ...MX_GRANDES],
  anual: true,
};

/** Concacaf Champions Cup (en el API, "CONCACAF Champions League"): 2026
 * se jugó de febrero a mayo; la 2027 empieza en febrero. */
export const CONCACAF_CHAMPIONS_CUP: Competition = {
  slug: "concacaf-champions-cup",
  leagueId: 16,
  season: 2026,
  name: "Concacaf Champions Cup",
  standingsMode: "none",
  archivedSeasons: [2025],
  region: "Concacaf",
  officialUrl: "https://www.concacaf.com",
  calendarOnlyTeamIds: [...MLS_GRANDES, ...MX_GRANDES],
  anual: true,
};

/** Campeones Cup: campeón de la MLS contra campeón de la Liga MX, partido
 * único (2026: 17-sep). */
export const CAMPEONES_CUP: Competition = {
  slug: "campeones-cup",
  leagueId: 885,
  season: 2026,
  name: "Campeones Cup",
  standingsMode: "none",
  archivedSeasons: [2025],
  region: "Concacaf",
  officialUrl: "https://www.concacaf.com",
  anual: true,
};

const SAUDI_GRANDES = [2939, 2932, 2938]; // Al-Nassr, Al-Hilal, Al-Ittihad

/** Liga saudí (Saudi Pro League): season 2026 = 2026-27. Una tabla de 18. */
export const LIGA_SAUDI: Competition = {
  slug: "liga-saudi",
  leagueId: 307,
  season: 2026,
  name: "Liga saudí",
  standingsMode: "table",
  archivedSeasons: [2025],
  region: "Arabia Saudí",
  officialUrl: "https://www.spl.com.sa",
  calendarOnlyTeamIds: SAUDI_GRANDES,
};

/*
 * Copas del Al-Nassr de Cristiano (14-oct-2026, pedido del dueño). Sacadas
 * de `/leagues?team=2939` y verificadas contra el API ese día. En la
 * portada, como la liga, solo los tres grandes.
 */

/** AFC Champions League Elite 2026-27: fase de liga en dos tablas (Oeste y
 * Este, 16 cada una; se pintan por grupo) y eliminatorias. En el API la
 * final se llama "Finals" (edición 2024-25). */
export const AFC_CHAMPIONS_LEAGUE: Competition = {
  slug: "afc-champions-league",
  leagueId: 17,
  season: 2026,
  name: "AFC Champions League Elite",
  standingsMode: "table",
  koStructure: [
    { label: "Octavos", re: /Round of 16/i, slots: 8 },
    { label: "Cuartos", re: /Quarter/i, slots: 4 },
    { label: "Semifinales", re: /Semi/i, slots: 2 },
    { label: "Final", re: /^Finals?$/i, slots: 1 },
  ],
  archivedSeasons: [2025],
  region: "Arabia Saudí",
  officialUrl: "https://www.the-afc.com",
  calendarOnlyTeamIds: SAUDI_GRANDES,
};

/** King's Cup (copa del Rey saudí). ⚠️ El API numera la temporada por el
 * año en que TERMINA: la 2026-27 es season 2027. Por eso `edicion` y sin
 * temporadas archivadas (el selector las escribiría un año desplazadas). */
export const KINGS_CUP: Competition = {
  slug: "kings-cup",
  leagueId: 504,
  season: 2027,
  name: "King's Cup",
  standingsMode: "none",
  koStructure: CUP_KO_STRUCTURE,
  region: "Arabia Saudí",
  officialUrl: "https://www.saff.com.sa",
  calendarOnlyTeamIds: SAUDI_GRANDES,
  edicion: "2026-27",
};

/** Supercopa saudí: semis y final en agosto. Igual que la King's Cup, la
 * season es el año en que termina la temporada: la última (ago-2025, final
 * Al-Nassr–Al-Ahli a penaltis) es la 2026; la siguiente aún no está
 * publicada y el vigilante avisará. */
export const SUPERCOPA_SAUDI: Competition = {
  slug: "supercopa-saudi",
  leagueId: 826,
  season: 2026,
  name: "Supercopa saudí",
  standingsMode: "none",
  koStructure: SUPERCOPA_KO_STRUCTURE,
  region: "Arabia Saudí",
  officialUrl: "https://www.saff.com.sa",
  edicion: "2025",
};

/** Nations League 2026-27 (24-sep → 17-nov-2026): 14 grupos repartidos en
 * Ligas A-D; se pintan por grupo. */
export const NATIONS_LEAGUE: Competition = {
  slug: "nations-league",
  leagueId: 5,
  season: 2026,
  name: "Nations League",
  standingsMode: "table",
  archivedSeasons: [2024],
  region: "Selecciones",
  officialUrl: "https://www.uefa.com/uefanationsleague/",
};

/**
 * Eliminatorias Conmebol. ⚠️ La última edición en la API es la del Mundial
 * 2026 (season 2026, terminó en sep-2025); la del Mundial 2030 aún no está
 * publicada (13-oct-2026). Cuando salga, subir `season` y archivar esta.
 */
export const ELIMINATORIAS_CONMEBOL: Competition = {
  slug: "eliminatorias-conmebol",
  leagueId: 34,
  season: 2026,
  name: "Eliminatorias Conmebol",
  standingsMode: "table",
  region: "Selecciones",
  officialUrl: "https://www.conmebol.com",
  anual: true,
  edicion: "Mundial 2026",
};

/**
 * Clasificación europea al Mundial. ⚠️ Igual: la última es la del Mundial
 * 2026 (season 2024, terminó en mar-2026). Subir `season` cuando la API
 * publique la del 2030. La clasificación a la Eurocopa (id 960) se añade
 * cuando exista la de la Euro 2028 (empieza en 2027; hoy solo está la 2023).
 */
export const ELIMINATORIAS_UEFA: Competition = {
  slug: "eliminatorias-uefa",
  leagueId: 32,
  season: 2024,
  name: "Clasificación UEFA al Mundial",
  standingsMode: "table",
  region: "Selecciones",
  officialUrl: "https://www.uefa.com/european-qualifiers/",
  anual: true,
  edicion: "Mundial 2026",
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
  LIGA_MX,
  LIGA_ARGENTINA,
  LIBERTADORES,
  MLS,
  US_OPEN_CUP,
  LEAGUES_CUP,
  CONCACAF_CHAMPIONS_CUP,
  CAMPEONES_CUP,
  LIGA_SAUDI,
  AFC_CHAMPIONS_LEAGUE,
  KINGS_CUP,
  SUPERCOPA_SAUDI,
  NATIONS_LEAGUE,
  ELIMINATORIAS_CONMEBOL,
  ELIMINATORIAS_UEFA,
];

export const COMPETITIONS_BY_SLUG: Record<string, Competition> = Object.fromEntries(
  COMPETITIONS.map((c) => [c.slug, c]),
);

/**
 * `COMPETITIONS` agrupadas por país para el desplegable "Competiciones" del
 * nav (`Header.tsx`) — dentro de cada país, la liga siempre primero (así
 * está ordenado `COMPETITIONS` ya: liga antes que sus copas). El orden de
 * los países es fijo: España, Inglaterra, Italia, Francia, Internacional
 * (las UEFA), Selecciones y después las ligas de fuera de Europa.
 */
const REGION_ORDER: CompetitionRegion[] = [
  "España",
  "Inglaterra",
  "Italia",
  "Francia",
  "Internacional",
  "Selecciones",
  "México",
  "Argentina",
  "Conmebol",
  "EE. UU. y Canadá",
  "Concacaf",
  "Arabia Saudí",
];

export const COMPETITION_GROUPS: { region: CompetitionRegion; competitions: Competition[] }[] =
  REGION_ORDER.map((region) => ({
    region,
    competitions: COMPETITIONS.filter((c) => c.region === region),
  })).filter((g) => g.competitions.length > 0);

/**
 * Desplegable «Competiciones» del menú (31-oct, pedido del dueño: «se ve muy
 * desordenado»). Por regiones salían 12 grupos, medio de ellos con una sola
 * competición; aquí son 4 bloques, lo importante primero.
 */
const MENU_SLUGS: { titulo: string; slugs: string[] }[] = [
  {
    titulo: "Europa",
    slugs: ["laliga", "premier", "serie-a", "ligue-1", "champions", "europa", "conference", "copa-del-rey", "supercopa", "fa-cup"],
  },
  { titulo: "Selecciones", slugs: ["nations-league", "eliminatorias-uefa", "eliminatorias-conmebol"] },
  {
    titulo: "América",
    slugs: ["libertadores", "liga-mx", "liga-argentina", "mls", "concacaf-champions-cup", "leagues-cup", "us-open-cup", "campeones-cup"],
  },
  { titulo: "Arabia Saudí", slugs: ["liga-saudi", "afc-champions-league", "kings-cup", "supercopa-saudi"] },
];

export const MENU_COMPETICIONES: { titulo: string; competitions: Competition[] }[] = (() => {
  const grupos = MENU_SLUGS.map((g) => ({
    titulo: g.titulo,
    competitions: g.slugs.map((s) => COMPETITIONS_BY_SLUG[s]).filter((c): c is Competition => !!c),
  }));
  // Una competición nueva que no esté en la lista no se pierde: va al final.
  const puestas = new Set(grupos.flatMap((g) => g.competitions.map((c) => c.slug)));
  const resto = COMPETITIONS.filter((c) => !puestas.has(c.slug));
  if (resto.length) grupos.push({ titulo: "Más", competitions: resto });
  return grupos.filter((g) => g.competitions.length > 0);
})();

/** Debajo del nombre en el menú: el país, o la confederación para las copas
 * europeas y las de selecciones. */
export const origenCompeticion = (c: Competition) =>
  c.region === "Internacional"
    ? "UEFA"
    : c.region === "Selecciones"
      ? c.slug.includes("conmebol")
        ? "Conmebol"
        : "UEFA"
      : c.region;

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
  // (la Nations League es Competition desde el 13-oct)
];
