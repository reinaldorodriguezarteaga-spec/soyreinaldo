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

export function isWorldCupActive(now = new Date()) {
  const t = now.getTime();
  return (
    t >= new Date(WORLD_CUP.startUtc).getTime() &&
    t < new Date(WORLD_CUP.endUtc).getTime()
  );
}
