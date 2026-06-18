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

/**
 * Partidos del Mundial alrededor de "hoy": en juego, o con kickoff entre
 * now−12h y now+14h. A diferencia del corte por día UTC, esta ventana no
 * parte la jornada cuando hay partidos de madrugada en husos americanos.
 */
export async function getWorldCupFixturesWindow(): Promise<Fixture[]> {
  const now = Date.now();
  const fromMs = now - 12 * 3600_000;
  const toMs = now + 14 * 3600_000;
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const r = await get<Fixture>(
    "/fixtures",
    {
      league: WORLD_CUP.leagueId,
      season: WORLD_CUP.season,
      from: day(fromMs),
      to: day(toMs),
    },
    60,
  );
  return r.response.filter((f) => {
    if (isLive(f)) return true;
    const ko = new Date(f.fixture.date).getTime();
    return ko >= fromMs && ko <= toMs;
  });
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

/**
 * Fixturas FINALIZADAS del Mundial 2026, la más reciente primero. Sin `n`
 * devuelve TODAS (no solo las últimas) — se derivan del calendario completo
 * (`getWorldCupAllFixtures`, cacheado y compartido con las stats, así que no
 * gasta cuota extra) en vez del parámetro `last`, que limitaba a N y dejaba
 * fuera los resultados más antiguos.
 */
export async function getWorldCupFinishedFixtures(n?: number): Promise<Fixture[]> {
  const all = await getWorldCupAllFixtures();
  const finished = all
    .filter(isFinal)
    .sort(
      (a, b) =>
        new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime(),
    );
  return n != null ? finished.slice(0, n) : finished;
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

/** Evento de un partido. Solo nos interesan los goles (type === "Goal"). */
type FixtureEvent = {
  time: { elapsed: number | null; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
};

/** Todos los partidos del Mundial (los 104), con su estado. Cachea 5 min. */
export async function getWorldCupAllFixtures(): Promise<Fixture[]> {
  const r = await get<Fixture>(
    "/fixtures",
    { league: WORLD_CUP.leagueId, season: WORLD_CUP.season },
    300,
  );
  return r.response;
}

/**
 * Eventos de un partido. Un partido terminado no cambia → caché de 1 día;
 * uno en juego → caché corta (30s) para ir casi en vivo.
 */
async function getFixtureEvents(
  fixtureId: number,
  finished: boolean,
): Promise<FixtureEvent[]> {
  const r = await get<FixtureEvent>(
    "/fixtures/events",
    { fixture: fixtureId },
    finished ? 86400 : 30,
  );
  return r.response;
}

/** Un único partido por id (para la página de detalle). null si no existe. */
export async function getFixtureById(
  id: number,
  revalidate = 300,
): Promise<Fixture | null> {
  const r = await get<Fixture>("/fixtures", { id }, revalidate);
  return r.response[0] ?? null;
}

/** Estadísticas por equipo de un partido (posesión, tiros, xG, paradas, …). */
export type TeamStatistics = {
  team: { id: number; name: string; logo: string };
  statistics: { type: string; value: number | string | null }[];
};
export async function getFixtureStatistics(
  id: number,
  revalidate = 300,
): Promise<TeamStatistics[]> {
  const r = await get<TeamStatistics>(
    "/fixtures/statistics",
    { fixture: id },
    revalidate,
  );
  return r.response;
}

/** Un gol de un partido, derivado de los eventos (orden cronológico). */
export type FixtureGoal = {
  minute: number | null;
  /** Equipo del jugador que ejecuta (en autogol, el que encaja). */
  teamId: number;
  player: string;
  /** "Normal Goal" | "Penalty" | "Own Goal". */
  detail: string;
  /** Asistente del gol, si lo hay. */
  assist: string | null;
};
export async function getFixtureGoals(
  id: number,
  revalidate = 600,
): Promise<FixtureGoal[]> {
  // `type=Goal`: solo goles (lo único que necesita el detalle) y, de paso, una
  // clave de caché DISTINTA de la del agregado de goleadores (que cachea todos
  // los eventos 1 día). Caché propia (600s, o más corta en directo) para que un
  // partido en curso o recién terminado muestre sus goles sin tocar esa caché
  // larga que /mundial usa para no ralentizarse.
  const r = await get<FixtureEvent>(
    "/fixtures/events",
    { fixture: id, type: "Goal" },
    revalidate,
  );
  return r.response
    .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty")
    .map((e) => ({
      minute: e.time.elapsed,
      teamId: e.team.id,
      player: e.player.name ?? "—",
      detail: e.detail,
      assist: e.assist?.name ?? null,
    }))
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

/** Una tarjeta de un partido (amarilla / roja / doble amarilla). */
export type FixtureCard = {
  minute: number | null;
  teamId: number;
  player: string;
  /** "Yellow Card" | "Red Card" | "Second Yellow card". */
  detail: string;
  /** true si supone expulsión (roja directa o segunda amarilla). */
  expulsion: boolean;
};
export async function getFixtureCards(
  id: number,
  revalidate = 600,
): Promise<FixtureCard[]> {
  // `type=Card`: solo tarjetas, con caché propia (600s, o más corta en directo)
  // y clave distinta de la del agregado de goleadores.
  const r = await get<FixtureEvent>(
    "/fixtures/events",
    { fixture: id, type: "Card" },
    revalidate,
  );
  return r.response
    .filter((e) => e.type === "Card")
    .map((e) => {
      const d = e.detail || "";
      return {
        minute: e.time.elapsed,
        teamId: e.team.id,
        player: e.player.name ?? "—",
        detail: d,
        expulsion: /red|second yellow/i.test(d),
      };
    })
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

/**
 * Goles + expulsiones derivados de los eventos COMPLETOS del partido
 * (`/fixtures/events?fixture=X`, sin filtro de tipo) — la MISMA URL/caché que ya
 * usa el agregado de goleadores, así que no añade llamadas a la API: rellena con
 * datos que normalmente ya están en caché. Para tarjetas de marcador.
 */
export async function getFixtureGoalsAndCards(
  id: number,
  finished = true,
): Promise<{ goals: FixtureGoal[]; reds: FixtureCard[] }> {
  const events = await getFixtureEvents(id, finished);
  const goals: FixtureGoal[] = events
    .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty")
    .map((e) => ({
      minute: e.time.elapsed,
      teamId: e.team.id,
      player: e.player.name ?? "—",
      detail: e.detail,
      assist: e.assist?.name ?? null,
    }))
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  const reds: FixtureCard[] = events
    .filter((e) => e.type === "Card" && /red|second yellow/i.test(e.detail || ""))
    .map((e) => ({
      minute: e.time.elapsed,
      teamId: e.team.id,
      player: e.player.name ?? "—",
      detail: e.detail || "",
      expulsion: true,
    }))
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  return { goals, reds };
}

/** Estadística detallada de un jugador en un partido (nulos = no registrado). */
export type PlayerMatchStats = {
  shotsTotal: number | null;
  shotsOn: number | null;
  passesTotal: number | null;
  passesKey: number | null;
  passesAcc: number | null;
  tackles: number | null;
  interceptions: number | null;
  duelsTotal: number | null;
  duelsWon: number | null;
  dribblesAttempts: number | null;
  dribblesSuccess: number | null;
  foulsDrawn: number | null;
  foulsCommitted: number | null;
  saves: number | null;
  yellow: number;
  red: number;
};

/** Valoración (y datos) de un jugador en un partido. */
export type PlayerRating = {
  id: number;
  name: string;
  photo: string | null;
  rating: number | null;
  /** Código del API: G / D / M / F. */
  position: string | null;
  minutes: number | null;
  number: number | null;
  captain: boolean;
  goals: number;
  assists: number;
  stats: PlayerMatchStats;
};
export type TeamPlayers = {
  team: { id: number; name: string; logo: string };
  players: PlayerRating[];
};

type RawPlayerStat = {
  games: {
    minutes: number | null;
    number: number | null;
    position: string | null;
    rating: string | null;
    captain: boolean | null;
  };
  shots: { total: number | null; on: number | null };
  goals: {
    total: number | null;
    assists: number | null;
    saves: number | null;
  };
  passes: { total: number | null; key: number | null; accuracy: number | string | null };
  tackles: { total: number | null; interceptions: number | null };
  duels: { total: number | null; won: number | null };
  dribbles: { attempts: number | null; success: number | null };
  fouls: { drawn: number | null; committed: number | null };
  cards: { yellow: number | null; red: number | null };
};

type FixturePlayersResponse = {
  team: { id: number; name: string; logo: string };
  players: Array<{
    player: { id: number; name: string; photo: string | null };
    statistics: RawPlayerStat[];
  }>;
};

function numOrNull(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Valoraciones + estadística detallada de los jugadores de un partido (las dos
 * alineaciones). Solo los que jugaron (tienen nota). Caché 600s.
 */
export async function getFixturePlayers(
  id: number,
  revalidate = 600,
): Promise<TeamPlayers[]> {
  const r = await get<FixturePlayersResponse>(
    "/fixtures/players",
    { fixture: id },
    revalidate,
  );
  return r.response.map((t) => ({
    team: t.team,
    players: t.players
      .map((p) => {
        const s = p.statistics[0];
        const rating = numOrNull(s?.games.rating ?? null);
        return {
          id: p.player.id,
          name: p.player.name,
          photo: p.player.photo ?? null,
          rating,
          position: s?.games.position ?? null,
          minutes: s?.games.minutes ?? null,
          number: s?.games.number ?? null,
          captain: s?.games.captain ?? false,
          goals: s?.goals.total ?? 0,
          assists: s?.goals.assists ?? 0,
          stats: {
            shotsTotal: numOrNull(s?.shots.total),
            shotsOn: numOrNull(s?.shots.on),
            passesTotal: numOrNull(s?.passes.total),
            passesKey: numOrNull(s?.passes.key),
            passesAcc: numOrNull(s?.passes.accuracy),
            tackles: numOrNull(s?.tackles.total),
            interceptions: numOrNull(s?.tackles.interceptions),
            duelsTotal: numOrNull(s?.duels.total),
            duelsWon: numOrNull(s?.duels.won),
            dribblesAttempts: numOrNull(s?.dribbles.attempts),
            dribblesSuccess: numOrNull(s?.dribbles.success),
            foulsDrawn: numOrNull(s?.fouls.drawn),
            foulsCommitted: numOrNull(s?.fouls.committed),
            saves: numOrNull(s?.goals.saves),
            yellow: s?.cards.yellow ?? 0,
            red: s?.cards.red ?? 0,
          },
        };
      })
      .filter((p) => p.rating != null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
  }));
}

/** Agregado de un jugador en TODO el Mundial (no de un partido). */
export type PlayerSeason = {
  id: number;
  name: string;
  photo: string | null;
  age: number | null;
  nationality: string | null;
  team: { name: string; logo: string } | null;
  position: string | null;
  appearances: number | null;
  lineups: number | null;
  minutes: number | null;
  rating: number | null;
  goals: number;
  assists: number;
  shotsTotal: number | null;
  shotsOn: number | null;
  passesTotal: number | null;
  passesKey: number | null;
  passesAcc: number | null;
  dribblesAttempts: number | null;
  dribblesSuccess: number | null;
  duelsTotal: number | null;
  duelsWon: number | null;
  tackles: number | null;
  interceptions: number | null;
  foulsDrawn: number | null;
  foulsCommitted: number | null;
  yellow: number;
  red: number;
  penaltyScored: number | null;
  penaltyMissed: number | null;
};

type PlayerSeasonResponse = {
  player: {
    id: number;
    name: string;
    photo: string | null;
    age: number | null;
    nationality: string | null;
  };
  statistics: Array<{
    team: { name: string; logo: string };
    games: {
      appearences: number | null;
      lineups: number | null;
      minutes: number | null;
      position: string | null;
      rating: string | null;
    };
    shots: { total: number | null; on: number | null };
    goals: { total: number | null; assists: number | null };
    passes: { total: number | null; key: number | null; accuracy: number | string | null };
    tackles: { total: number | null; interceptions: number | null };
    duels: { total: number | null; won: number | null };
    dribbles: { attempts: number | null; success: number | null };
    fouls: { drawn: number | null; committed: number | null };
    cards: { yellow: number | null; yellowred: number | null; red: number | null };
    penalty: { scored: number | null; missed: number | null };
  }>;
};

/** Estadísticas agregadas de un jugador en el Mundial 2026. Caché 10 min. */
export async function getPlayerSeasonStats(
  id: number,
): Promise<PlayerSeason | null> {
  const r = await get<PlayerSeasonResponse>(
    "/players",
    { id, league: WORLD_CUP.leagueId, season: WORLD_CUP.season },
    600,
  );
  const p = r.response[0];
  const s = p?.statistics[0];
  if (!p || !s) return null;
  return {
    id: p.player.id,
    name: p.player.name,
    photo: p.player.photo ?? null,
    age: p.player.age ?? null,
    nationality: p.player.nationality ?? null,
    team: s.team ? { name: s.team.name, logo: s.team.logo } : null,
    position: s.games?.position ?? null,
    appearances: s.games?.appearences ?? null,
    lineups: s.games?.lineups ?? null,
    minutes: s.games?.minutes ?? null,
    rating: numOrNull(s.games?.rating ?? null),
    goals: s.goals?.total ?? 0,
    assists: s.goals?.assists ?? 0,
    shotsTotal: numOrNull(s.shots?.total),
    shotsOn: numOrNull(s.shots?.on),
    passesTotal: numOrNull(s.passes?.total),
    passesKey: numOrNull(s.passes?.key),
    passesAcc: numOrNull(s.passes?.accuracy),
    dribblesAttempts: numOrNull(s.dribbles?.attempts),
    dribblesSuccess: numOrNull(s.dribbles?.success),
    duelsTotal: numOrNull(s.duels?.total),
    duelsWon: numOrNull(s.duels?.won),
    tackles: numOrNull(s.tackles?.total),
    interceptions: numOrNull(s.tackles?.interceptions),
    foulsDrawn: numOrNull(s.fouls?.drawn),
    foulsCommitted: numOrNull(s.fouls?.committed),
    yellow: s.cards?.yellow ?? 0,
    red: (s.cards?.red ?? 0) + (s.cards?.yellowred ?? 0),
    penaltyScored: numOrNull(s.penalty?.scored),
    penaltyMissed: numOrNull(s.penalty?.missed),
  };
}

/** Un jugador en la alineación (con su posición en la rejilla "fila:columna"). */
export type LineupPlayer = {
  id: number;
  number: number | null;
  name: string;
  pos: string | null;
  /** "fila:columna" del API (fila 1 = portero). null si no la da. */
  grid: string | null;
};
export type LineupTeam = {
  teamId: number;
  formation: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
};

type RawLineupEntry = {
  player: {
    id: number;
    number: number | null;
    name: string;
    pos: string | null;
    grid: string | null;
  };
};
type LineupsResponse = {
  team: { id: number };
  formation: string | null;
  startXI: RawLineupEntry[];
  substitutes: RawLineupEntry[];
};

/** Alineaciones del partido (formación + rejilla de cada titular). Caché 600s. */
export async function getFixtureLineups(
  id: number,
  revalidate = 600,
): Promise<LineupTeam[]> {
  const r = await get<LineupsResponse>("/fixtures/lineups", { fixture: id }, revalidate);
  const map = (a: RawLineupEntry[]): LineupPlayer[] =>
    (a ?? []).map((x) => ({
      id: x.player.id,
      number: x.player.number,
      name: x.player.name,
      pos: x.player.pos,
      grid: x.player.grid,
    }));
  return r.response.map((t) => ({
    teamId: t.team.id,
    formation: t.formation,
    startXI: map(t.startXI),
    substitutes: map(t.substitutes),
  }));
}

/**
 * Goleadores y asistidores del Mundial calculados a partir de los EVENTOS de
 * cada partido (goles y asistencias), que se publican casi en vivo — a
 * diferencia del agregado /players/topscorers, que API-Football tarda horas en
 * consolidar al inicio del torneo. Se enriquece con metadatos (foto, PJ,
 * minutos) del agregado cuando ya existen; la valoración media (ratings) se
 * toma del agregado, que es la única fuente.
 */
export async function getWorldCupPlayerStats(n = 10): Promise<{
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  ratings: PlayerStatLeader[];
}> {
  const fixtures = await getWorldCupAllFixtures();
  const relevant = fixtures.filter((f) => isFinal(f) || isLive(f));

  // Eventos de cada partido relevante, en lotes para no saturar el rate limit.
  const eventsByFixture: FixtureEvent[][] = [];
  const BATCH = 8;
  for (let i = 0; i < relevant.length; i += BATCH) {
    const chunk = relevant.slice(i, i + BATCH);
    const res = await Promise.all(
      chunk.map((f) => getFixtureEvents(f.fixture.id, isFinal(f))),
    );
    eventsByFixture.push(...res);
  }

  type Tally = {
    player: { id: number; name: string };
    team: { id: number; name: string; logo: string };
    goals: number;
    assists: number;
  };
  const tally = new Map<number, Tally>();
  const bump = (
    id: number | null,
    name: string | null,
    team: FixtureEvent["team"],
    kind: "goals" | "assists",
  ) => {
    if (id == null) return;
    let t = tally.get(id);
    if (!t) {
      t = { player: { id, name: name ?? "—" }, team, goals: 0, assists: 0 };
      tally.set(id, t);
    }
    t[kind] += 1;
  };

  for (const events of eventsByFixture) {
    for (const e of events) {
      if (e.type !== "Goal") continue;
      // El autogol no acredita al ejecutor; la penalti fallada no es gol.
      if (e.detail === "Own Goal" || e.detail === "Missed Penalty") continue;
      bump(e.player.id, e.player.name, e.team, "goals");
      if (e.assist && e.assist.id != null) {
        bump(e.assist.id, e.assist.name, e.team, "assists");
      }
    }
  }

  // Metadatos del agregado (foto, PJ, minutos, valoración) cuando existan.
  const [aggScorers, aggAssists] = await Promise.all([
    getWorldCupTopScorers(50),
    getWorldCupTopAssists(50),
  ]);
  const meta = new Map<number, PlayerStatLeader>();
  for (const p of [...aggScorers, ...aggAssists]) {
    if (!meta.has(p.player.id)) meta.set(p.player.id, p);
  }

  const toLeader = (t: Tally): PlayerStatLeader => {
    const ms = meta.get(t.player.id)?.statistics[0];
    const mp = meta.get(t.player.id)?.player;
    return {
      player: {
        id: t.player.id,
        name: mp?.name ?? t.player.name,
        photo: mp?.photo ?? "",
        nationality: mp?.nationality ?? null,
      },
      statistics: [
        {
          team: ms?.team ?? t.team,
          goals: { total: t.goals, assists: t.assists },
          games: {
            appearences: ms?.games.appearences ?? null,
            minutes: ms?.games.minutes ?? null,
            rating: ms?.games.rating ?? null,
          },
        },
      ],
    };
  };

  const all = [...tally.values()];
  const scorers = all
    .filter((t) => t.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, n)
    .map(toLeader);
  const assists = all
    .filter((t) => t.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, n)
    .map(toLeader);

  const ratings = ratingLeaders(aggScorers, aggAssists, n);
  return { scorers, assists, ratings };
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
