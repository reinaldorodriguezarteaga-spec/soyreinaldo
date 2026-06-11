/**
 * Cliente delgado para api-sports.io (API-Football).
 *
 * Solo se usa en server components / route handlers — la key vive en
 * `API_FOOTBALL_KEY` y nunca debe exponerse al cliente. Cada llamada usa
 * el caché HTTP de Next.js (`next.revalidate`) para no quemar quota.
 */

const BASE = "https://v3.football.api-sports.io";

export const TEAM_IDS = {
  barcelona: 529,
  realMadrid: 541,
} as const;

export const LALIGA = {
  leagueId: 140,
  // Temporada actual en API-Football se marca por el año de inicio
  // (la 2025-26 = 2025).
  season: 2025,
} as const;

export const WORLD_CUP = {
  leagueId: 1,
  season: 2026,
  // Inclusive on both ends. Group stage starts Jun 11 in CDMX, final on Jul 19.
  startUtc: "2026-06-11T00:00:00Z",
  endUtc: "2026-07-20T00:00:00Z",
} as const;

export type FixtureStatusShort =
  | "TBD" // To Be Defined
  | "NS" // Not Started
  | "1H" // First Half
  | "HT" // Halftime
  | "2H" // Second Half
  | "ET" // Extra Time
  | "BT" // Break Time (en alargues)
  | "P" // Penalty In Progress
  | "SUSP" // Suspended
  | "INT" // Interrupted
  | "FT" // Full Time
  | "AET" // After Extra Time
  | "PEN" // Penalties finished
  | "PST" // Postponed
  | "CANC"
  | "ABD"
  | "AWD"
  | "WO"
  | "LIVE";

export type Fixture = {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: FixtureStatusShort; elapsed: number | null };
    venue: { name: string | null; city: string | null };
  };
  league: { id: number; name: string; logo: string; round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
};

const LIVE_STATES: FixtureStatusShort[] = [
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "LIVE",
];
const FINAL_STATES: FixtureStatusShort[] = ["FT", "AET", "PEN"];

export function isLive(f: Fixture) {
  return LIVE_STATES.includes(f.fixture.status.short);
}
export function isFinal(f: Fixture) {
  return FINAL_STATES.includes(f.fixture.status.short);
}

async function get<T>(
  path: string,
  params: Record<string, string | number>,
  revalidateSeconds: number,
): Promise<{ response: T[]; errors: unknown }> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY missing");

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": key },
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) {
    return { response: [], errors: { httpStatus: res.status } };
  }
  return res.json();
}

/**
 * Próximo partido (o partido en curso hoy) de un equipo.
 *
 * 1. Si tiene un partido live ahora → ese.
 * 2. Si tiene uno terminado en las últimas ~3h → ese (resultado fresco).
 * 3. Si no, su próximo upcoming.
 */
export async function getRelevantFixtureForTeam(
  teamId: number,
): Promise<Fixture | null> {
  // Live now
  const live = await get<Fixture>("/fixtures", { team: teamId, live: "all" }, 30);
  if (live.response.length > 0) return live.response[0];

  // Last finished (today)
  const last = await get<Fixture>("/fixtures", { team: teamId, last: 1 }, 300);
  const lastFx = last.response[0];
  if (lastFx && isFinal(lastFx)) {
    const ageMs = Date.now() - new Date(lastFx.fixture.date).getTime();
    if (ageMs > 0 && ageMs < 4 * 60 * 60 * 1000) {
      return lastFx;
    }
  }

  // Next upcoming
  const next = await get<Fixture>("/fixtures", { team: teamId, next: 1 }, 1800);
  return next.response[0] ?? null;
}

/**
 * Partidos del Mundial 2026 hoy (UTC). Usado durante el torneo.
 */
export async function getWorldCupFixturesForDay(date: Date): Promise<Fixture[]> {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const day = `${yyyy}-${mm}-${dd}`;

  const r = await get<Fixture>(
    "/fixtures",
    {
      league: WORLD_CUP.leagueId,
      season: WORLD_CUP.season,
      from: day,
      to: day,
    },
    60,
  );
  return r.response;
}

export type StandingRow = {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  /** Nombre del grupo en torneos con fase de grupos (p. ej. "Group A"). */
  group?: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
  form: string | null;
};

type StandingsResponse = {
  league: {
    id: number;
    name: string;
    logo: string;
    standings: StandingRow[][];
  };
};

/**
 * Clasificación completa de LaLiga (20 equipos). Cachea 1h porque la tabla
 * solo cambia tras cada jornada.
 */
export async function getLaligaStandings(): Promise<StandingRow[]> {
  const r = await get<StandingsResponse>(
    "/standings",
    { league: LALIGA.leagueId, season: LALIGA.season },
    3600,
  );
  const groups = r.response[0]?.league.standings ?? [];
  return groups.flat();
}

/**
 * Próximas N fixturas de LaLiga (típicamente 10 = una jornada).
 */
export async function getLaligaUpcomingFixtures(n: number): Promise<Fixture[]> {
  const r = await get<Fixture>(
    "/fixtures",
    { league: LALIGA.leagueId, season: LALIGA.season, next: n },
    600,
  );
  return r.response;
}

/** Un grupo del Mundial con sus filas de clasificación, en orden. */
export type WcGroup = { group: string; rows: StandingRow[] };

/**
 * Clasificación del Mundial 2026 agrupada (Group A..L). Cachea 10 min;
 * durante el torneo el cron de ingesta y este caché mantienen la tabla fresca.
 */
export async function getWorldCupStandings(): Promise<WcGroup[]> {
  const r = await get<StandingsResponse>(
    "/standings",
    { league: WORLD_CUP.leagueId, season: WORLD_CUP.season },
    600,
  );
  const groups = r.response[0]?.league.standings ?? [];
  return groups
    .map((rows) => ({ group: rows[0]?.group ?? "", rows }))
    .filter((g) => g.rows.length > 0)
    // Solo los grupos reales (A..L), normalizando el nombre: el API a veces
    // los llama "Group A" y a veces "Group Stage - Group A" (cambió el 11-jun).
    // La tabla extra "Ranking of third-placed teams" no matchea y queda fuera.
    .flatMap((g) => {
      const m = g.group.match(/Group ([A-L])$/);
      return m ? [{ group: `Group ${m[1]}`, rows: g.rows }] : [];
    })
    .sort((a, b) => a.group.localeCompare(b.group));
}

/** Próximas N fixturas del Mundial 2026. */
export async function getWorldCupUpcomingFixtures(n: number): Promise<Fixture[]> {
  const r = await get<Fixture>(
    "/fixtures",
    { league: WORLD_CUP.leagueId, season: WORLD_CUP.season, next: n },
    600,
  );
  return r.response;
}

/** Últimas N fixturas FINALIZADAS del Mundial 2026 (la más reciente primero). */
export async function getWorldCupFinishedFixtures(n: number): Promise<Fixture[]> {
  const r = await get<Fixture>(
    "/fixtures",
    { league: WORLD_CUP.leagueId, season: WORLD_CUP.season, last: n },
    300,
  );
  return r.response;
}

/** Líder de una estadística de jugador (goleador / asistidor / valoración). */
export type PlayerStatLeader = {
  player: {
    id: number;
    name: string;
    photo: string;
    nationality: string | null;
  };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    goals: { total: number | null; assists: number | null };
    games: {
      appearences: number | null;
      minutes: number | null;
      /** Valoración media del torneo, p. ej. "7.43". */
      rating: string | null;
    };
  }>;
};

async function topPlayers(
  path: "/players/topscorers" | "/players/topassists",
  n: number,
): Promise<PlayerStatLeader[]> {
  const r = await get<PlayerStatLeader>(
    path,
    { league: WORLD_CUP.leagueId, season: WORLD_CUP.season },
    600,
  );
  return r.response.slice(0, n);
}

/** Máximos goleadores del Mundial (vacío hasta que empiece el torneo). */
export function getWorldCupTopScorers(n = 10): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topscorers", n);
}

/** Máximos asistidores del Mundial (vacío hasta que empiece el torneo). */
export function getWorldCupTopAssists(n = 10): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topassists", n);
}

/**
 * Ranking por valoración media, derivado de la unión goleadores+asistidores
 * (el API no expone un "top rated" global; esto cubre a los destacados del
 * torneo sin gastar llamadas extra).
 */
export function ratingLeaders(
  scorers: PlayerStatLeader[],
  assists: PlayerStatLeader[],
  n = 10,
): PlayerStatLeader[] {
  const byId = new Map<number, PlayerStatLeader>();
  for (const p of [...scorers, ...assists]) {
    if (!byId.has(p.player.id)) byId.set(p.player.id, p);
  }
  return [...byId.values()]
    .filter((p) => {
      const r = p.statistics[0]?.games.rating;
      return r != null && !Number.isNaN(parseFloat(r));
    })
    .sort(
      (a, b) =>
        parseFloat(b.statistics[0].games.rating!) -
        parseFloat(a.statistics[0].games.rating!),
    )
    .slice(0, n);
}

/**
 * Mejor ataque (más GF) y mejor defensa (menos GC) por selección, derivados
 * de la clasificación de grupos — cero llamadas extra. Vacíos pre-torneo.
 */
export function teamAttackDefense(groups: WcGroup[]): {
  attack: StandingRow[];
  defense: StandingRow[];
} {
  const rows = groups.flatMap((g) => g.rows);
  const played = rows.filter((r) => r.all.played > 0);
  if (played.length === 0) return { attack: [], defense: [] };
  const attack = [...played]
    .sort((a, b) => b.all.goals.for - a.all.goals.for)
    .slice(0, 5);
  const defense = [...played]
    .sort((a, b) => a.all.goals.against - b.all.goals.against)
    .slice(0, 5);
  return { attack, defense };
}

/**
 * Equipo más goleador y más goleado, derivados de la clasificación de grupos.
 * Devuelve null cuando aún no se ha marcado ningún gol (pre-torneo) para que
 * la UI muestre estado vacío en lugar de un equipo arbitrario.
 */
export function teamGoalLeaders(groups: WcGroup[]): {
  mostScoring: StandingRow | null;
  mostConceded: StandingRow | null;
} {
  const rows = groups.flatMap((g) => g.rows);
  const anyGoals = rows.some(
    (r) => r.all.goals.for > 0 || r.all.goals.against > 0,
  );
  if (!anyGoals) return { mostScoring: null, mostConceded: null };
  const mostScoring = [...rows].sort(
    (a, b) => b.all.goals.for - a.all.goals.for,
  )[0];
  const mostConceded = [...rows].sort(
    (a, b) => b.all.goals.against - a.all.goals.against,
  )[0];
  return { mostScoring: mostScoring ?? null, mostConceded: mostConceded ?? null };
}

/**
 * xG agregado por equipo — sin fuente fiable a día de hoy (API-Football no
 * expone xG agregado del Mundial de forma consistente). Stub con fallback:
 * devuelve null para que la UI oculte la tarjeta. Cablear aquí si en el futuro
 * hay una fuente fiable de xG.
 */
export async function getWorldCupTopXg(): Promise<{
  team: { name: string; logo: string };
  xg: number;
} | null> {
  return null;
}

export function isWorldCupActive(now = new Date()) {
  const t = now.getTime();
  return (
    t >= new Date(WORLD_CUP.startUtc).getTime() &&
    t < new Date(WORLD_CUP.endUtc).getTime()
  );
}
