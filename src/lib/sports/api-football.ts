/**
 * Cliente delgado para api-sports.io (API-Football).
 *
 * Solo se usa en server components / route handlers — la key vive en
 * `API_FOOTBALL_KEY` y nunca debe exponerse al cliente. Cada llamada se cachea
 * con `unstable_cache` (⚠️ en Next 16 `fetch` + `next.revalidate` ya NO cachea,
 * así que sin esto cada render pegaba a API-Football y quemaba la quota).
 */

import { unstable_cache } from "next/cache";
import { WORLD_CUP_2026, type Competition, type KoStructureEntry } from "./competitions";
import { cachedOrLive, readCache } from "./sports-cache";

const BASE = "https://v3.football.api-sports.io";

export const TEAM_IDS = {
  barcelona: 529,
  realMadrid: 541,
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

/**
 * Llamada CRUDA a API-Football (una sola por cache-miss). Loguea `[apif]` solo
 * cuando de verdad sale a la red, así el volumen de esas líneas en los logs de
 * Vercel mide directamente la eficacia del caché. Lanza en error de red/HTTP o
 * cuando la API responde 200 con `errors` (p.ej. quota agotada) → así
 * `unstable_cache` NO cachea el fallo y se recupera en cuanto la API vuelve.
 */
async function rawGet<T>(
  url: string,
  path: string,
  paramStr: string,
): Promise<{ response: T[]; errors: unknown }> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY missing");

  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store", // el único caché es unstable_cache (capa de abajo)
  });

  const remaining =
    res.headers.get("x-ratelimit-requests-remaining") ??
    res.headers.get("X-RateLimit-Remaining") ??
    "?";
  console.log(
    `[apif] ${path}${paramStr ? `?${paramStr}` : ""} status=${res.status} remaining=${remaining}`,
  );

  if (!res.ok) throw new Error(`apif http ${res.status} ${path}`);

  const json = (await res.json()) as { response: T[]; errors: unknown };
  const errs = json.errors;
  const hasErr = Array.isArray(errs)
    ? errs.length > 0
    : !!errs && typeof errs === "object" && Object.keys(errs).length > 0;
  if (hasErr) throw new Error(`apif errors ${path}: ${JSON.stringify(errs)}`);

  return json;
}

async function get<T>(
  path: string,
  params: Record<string, string | number>,
  revalidateSeconds: number,
): Promise<{ response: T[]; errors: unknown }> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const urlStr = url.toString();
  const paramStr = Object.entries(params)
    .filter(([k]) => k !== "key")
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  // Caché REAL por URL. La clave incluye la URL completa (endpoint + params) y
  // el TTL = revalidateSeconds de cada llamada. unstable_cache SÍ cachea aunque
  // la ruta sea dinámica (a diferencia de fetch+next.revalidate en Next 16).
  //
  // El try/catch vive DENTRO de la función cacheada a propósito: unstable_cache
  // nunca cachea un throw, así que si el catch estuviera fuera, cada visita
  // durante una caída de la API (cuota, rate-limit, red) relanzaba la llamada
  // de cero — con muchos usuarios a la vez eso amplifica un problema de cuota
  // puntual en una tormenta de reintentos que no se cura sola (incidentes
  // 5-jul y 13-ago: la API tardaba horas en "recuperarse" aunque la cuota ya
  // hubiera reseteado, porque el tráfico normal la volvía a agotar al
  // instante). Cacheando el fallo con el MISMO TTL que un éxito, como mucho
  // se reintenta cada `revalidateSeconds` — igual que si hubiera ido bien.
  const cached = unstable_cache(
    async () => {
      try {
        return await rawGet<T>(urlStr, path, paramStr);
      } catch {
        return { response: [] as T[], errors: { failed: true } };
      }
    },
    ["apif", urlStr],
    { revalidate: revalidateSeconds },
  );

  try {
    return await cached();
  } catch {
    // Red de respaldo por si unstable_cache en sí falla (infra, no la API).
    // Lo maneja el fallback a BD de /mundial (wc-fallback.ts).
    return { response: [], errors: { failed: true } };
  }
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
export async function getCompetitionFixturesForDay(
  date: Date,
  competition: Competition,
): Promise<Fixture[]> {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const day = `${yyyy}-${mm}-${dd}`;

  const r = await get<Fixture>(
    "/fixtures",
    {
      league: competition.leagueId,
      season: competition.season,
      from: day,
      to: day,
    },
    60,
  );
  return r.response;
}

export function getWorldCupFixturesForDay(date: Date): Promise<Fixture[]> {
  return getCompetitionFixturesForDay(date, WORLD_CUP_2026);
}

/**
 * Partidos de la competición alrededor de "hoy": en juego, o con kickoff
 * entre now−12h y now+14h. A diferencia del corte por día UTC, esta ventana
 * no parte la jornada cuando hay partidos de madrugada en husos americanos.
 */
export async function getCompetitionFixturesWindow(
  competition: Competition,
): Promise<Fixture[]> {
  const now = Date.now();
  const fromMs = now - 12 * 3600_000;
  const toMs = now + 14 * 3600_000;
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const r = await get<Fixture>(
    "/fixtures",
    {
      league: competition.leagueId,
      season: competition.season,
      from: day(fromMs),
      to: day(toMs),
    },
    // 45s (antes 20s): el widget de portada polea cada 20s CRUZANDO LAS 9
    // COMPETICIONES — con TTL=20s el caché caducaba justo antes de cada
    // poll, así que casi todos los polls de todos los visitantes pegaban
    // en vivo a la API (causa real de la ráfaga sostenida de 429 del
    // 23-jul, no solo el caché frío de un deploy). 45s > 20s de margen
    // para que la mayoría de polls sí acierten en caché; sigue siendo
    // razonablemente fresco para marcadores en vivo.
    45,
  );
  return r.response.filter((f) => {
    if (isLive(f)) return true;
    const ko = new Date(f.fixture.date).getTime();
    return ko >= fromMs && ko <= toMs;
  });
}

export function getWorldCupFixturesWindow(): Promise<Fixture[]> {
  return getCompetitionFixturesWindow(WORLD_CUP_2026);
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

/** Un grupo (torneos con fase de grupos) con sus filas de clasificación, en orden. */
export type WcGroup = { group: string; rows: StandingRow[] };

/**
 * Clasificación de una competición. Devuelve una tabla plana (`standingsMode:
 * "table"`, ligas normales), por grupos (`"groups"`, Mundial), o `null`
 * (`"none"`, competiciones sin tabla — puro KO). Cachea 30 min — no cambia
 * salvo que se juegue un partido, y con 9 competiciones activas el coste de
 * refrescarla cada 10 min ya provocaba ráfagas de rate-limit (429) contra la
 * API tras cada deploy (caché en frío).
 */
/** Clave de sports_cache para la tabla de una competición — exportada para
 * que el cron (/api/cron/refresh-sports-cache) escriba bajo la misma clave
 * que lee esta función. */
export function standingsCacheKey(competition: Competition): string {
  return `standings:${competition.slug}`;
}

export async function getCompetitionStandings(
  competition: Competition,
  opts: { forceLive?: boolean } = {},
): Promise<StandingRow[] | WcGroup[] | null> {
  if (competition.standingsMode === "none") return null;

  const parse = (r: StandingsResponse[]): StandingRow[] | WcGroup[] => {
    const groups = r[0]?.league.standings ?? [];
    if (competition.standingsMode === "table") {
      return (groups[0] ?? []).slice().sort((a, b) => a.rank - b.rank);
    }
    return groups
      .map((rows) => ({ group: rows[0]?.group ?? "", rows }))
      .filter((g) => g.rows.length > 0)
      // Solo los grupos reales (A..L), normalizando el nombre: el API a veces
      // los llama "Group A" y a veces "Group Stage - Group A" (cambió 11-jun).
      // La tabla extra "Ranking of third-placed teams" no matchea, fuera.
      .flatMap((g) => {
        const m = g.group.match(/Group ([A-L])$/);
        return m ? [{ group: `Group ${m[1]}`, rows: g.rows }] : [];
      })
      .sort((a, b) => a.group.localeCompare(b.group));
  };

  const fetchLive = async () =>
    parse(
      (
        await get<StandingsResponse>(
          "/standings",
          { league: competition.leagueId, season: competition.season },
          1800,
        )
      ).response,
    );

  // Precalculado por el cron (/api/cron/refresh-sports-cache) — con 9
  // competiciones, dejar esto solo en manos del TTL de cada visitante hace
  // que un pico de tráfico (o un bot) pueda agotar la cuota diaria en
  // minutos. Cae a la llamada en vivo si el cron no ha corrido o está viejo.
  // `forceLive` lo usa el propio cron para refrescar el caché en vez de leerlo.
  if (opts.forceLive) return fetchLive();
  return cachedOrLive(standingsCacheKey(competition), 2400, fetchLive);
}

/**
 * Clasificación del Mundial 2026 agrupada (Group A..L). Durante el torneo el
 * cron de ingesta y este caché mantienen la tabla fresca.
 */
export async function getWorldCupStandings(): Promise<WcGroup[]> {
  return (await getCompetitionStandings(WORLD_CUP_2026)) as WcGroup[];
}

/**
 * Próximas N fixturas de una competición. Cachea 30 min — el calendario no
 * cambia salvo aplazamientos puntuales (ver nota de rate-limit en
 * `getCompetitionStandings`, misma razón).
 */
/** Techo de fixturas próximas que cachea el cron — cualquier `n` pedido se
 * sirve recortando este mismo caché (hoy el mayor `n` real es 12, en
 * /liga/[slug]). */
const UPCOMING_CACHE_N = 12;

/** Clave de sports_cache para las próximas fixturas de una competición
 * (siempre las UPCOMING_CACHE_N primeras — ver nota arriba). */
export function upcomingCacheKey(competition: Competition): string {
  return `upcoming:${competition.slug}`;
}

export async function getCompetitionUpcomingFixtures(
  competition: Competition,
  n: number,
  opts: { forceLive?: boolean } = {},
): Promise<Fixture[]> {
  const fetchLive = async (nn: number) =>
    (
      await get<Fixture>(
        "/fixtures",
        { league: competition.leagueId, season: competition.season, next: nn },
        1800,
      )
    ).response;

  if (opts.forceLive) return fetchLive(UPCOMING_CACHE_N);

  // Precalculado por el cron — ver nota en getCompetitionStandings. Solo se
  // usa el caché cuando cubre el `n` pedido (si algún día se pide más de
  // UPCOMING_CACHE_N, cae a la llamada en vivo sin romper nada).
  if (n <= UPCOMING_CACHE_N) {
    const cached = await readCache<Fixture[]>(upcomingCacheKey(competition), 2400);
    if (cached) return cached.slice(0, n);
  }
  return fetchLive(n);
}

/** Próximas N fixturas del Mundial 2026. */
export function getWorldCupUpcomingFixtures(n: number): Promise<Fixture[]> {
  return getCompetitionUpcomingFixtures(WORLD_CUP_2026, n);
}

/**
 * Fixturas FINALIZADAS de una competición, la más reciente primero. Sin `n`
 * devuelve TODAS (no solo las últimas) — se derivan del calendario completo
 * (`getCompetitionAllFixtures`, cacheado y compartido con las stats, así que
 * no gasta cuota extra) en vez del parámetro `last`, que limitaba a N y
 * dejaba fuera los resultados más antiguos.
 */
export async function getCompetitionFinishedFixtures(
  competition: Competition,
  n?: number,
): Promise<Fixture[]> {
  const all = await getCompetitionAllFixtures(competition);
  const finished = all
    .filter(isFinal)
    .sort(
      (a, b) =>
        new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime(),
    );
  return n != null ? finished.slice(0, n) : finished;
}

export function getWorldCupFinishedFixtures(n?: number): Promise<Fixture[]> {
  return getCompetitionFinishedFixtures(WORLD_CUP_2026, n);
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
    /** Solo presente en los rankings de tarjetas. */
    cards?: { yellow: number | null; yellowred: number | null; red: number | null };
  }>;
};

async function topPlayers(
  path:
    | "/players/topscorers"
    | "/players/topassists"
    | "/players/topyellowcards"
    | "/players/topredcards",
  n: number,
  competition: Competition,
): Promise<PlayerStatLeader[]> {
  // 30 min: cada carga de /liga/[slug] dispara 3 de estas (scorers+assists+
  // cards) — con 9 competiciones activas, 10 min de caché ya generaba
  // ráfagas de rate-limit (429) contra la API tras cada deploy.
  const r = await get<PlayerStatLeader>(
    path,
    { league: competition.leagueId, season: competition.season },
    1800,
  );
  return r.response.slice(0, n);
}

export function getCompetitionTopScorers(
  competition: Competition,
  n = 10,
): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topscorers", n, competition);
}

export function getCompetitionTopAssists(
  competition: Competition,
  n = 10,
): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topassists", n, competition);
}

export function getCompetitionTopYellowCards(
  competition: Competition,
  n = 10,
): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topyellowcards", n, competition);
}

/** Máximos goleadores del Mundial (vacío hasta que empiece el torneo). */
export function getWorldCupTopScorers(n = 10): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topscorers", n, WORLD_CUP_2026);
}

/** Máximos asistidores del Mundial (vacío hasta que empiece el torneo). */
export function getWorldCupTopAssists(n = 10): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topassists", n, WORLD_CUP_2026);
}

/** Jugadores con más tarjetas amarillas del Mundial ("el tarjetero"). */
export function getWorldCupTopYellowCards(n = 10): Promise<PlayerStatLeader[]> {
  return topPlayers("/players/topyellowcards", n, WORLD_CUP_2026);
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

/** Un evento de la cronología del partido (todos los tipos). */
export type TimelineEvent = {
  minute: number | null;
  extra: number | null;
  teamId: number;
  kind:
    | "goal"
    | "own_goal"
    | "penalty_goal"
    | "missed_penalty"
    | "yellow"
    | "red"
    | "sub"
    | "var_disallowed";
  /** Protagonista: goleador, amonestado, o el que ENTRA en un cambio. */
  player: string | null;
  /** Detalle: asistente (gol), el que SALE (cambio), o motivo (VAR). */
  detail: string | null;
};

/**
 * Cronología completa del partido (goles, tarjetas, cambios, penaltis fallados
 * y goles anulados por VAR), ordenada por minuto. Una llamada a
 * `/fixtures/events`. Vacío si el partido aún no ha empezado.
 */
export async function getFixtureTimeline(
  id: number,
  revalidate = 60,
): Promise<TimelineEvent[]> {
  const r = await get<FixtureEvent>("/fixtures/events", { fixture: id }, revalidate);
  const out: TimelineEvent[] = [];
  for (const e of r.response) {
    const detail = (e.detail || "").toLowerCase();
    const base = {
      minute: e.time.elapsed,
      extra: e.time.extra ?? null,
      teamId: e.team.id,
    };
    if (e.type === "Goal") {
      if (detail === "missed penalty") {
        out.push({ ...base, kind: "missed_penalty", player: e.player.name ?? "—", detail: null });
      } else if (detail === "own goal") {
        out.push({ ...base, kind: "own_goal", player: e.player.name ?? "—", detail: null });
      } else if (detail === "penalty") {
        out.push({ ...base, kind: "penalty_goal", player: e.player.name ?? "—", detail: "de penalti" });
      } else {
        out.push({ ...base, kind: "goal", player: e.player.name ?? "—", detail: e.assist.name ?? null });
      }
    } else if (e.type === "Card") {
      if (detail.includes("red")) {
        out.push({ ...base, kind: "red", player: e.player.name ?? "—", detail: null });
      } else if (detail.includes("second yellow")) {
        out.push({ ...base, kind: "red", player: e.player.name ?? "—", detail: "doble amarilla" });
      } else {
        out.push({ ...base, kind: "yellow", player: e.player.name ?? "—", detail: null });
      }
    } else if (e.type === "subst") {
      // En /fixtures/events de un cambio: `assist` = entra, `player` = sale.
      // Mostramos al que ENTRA como protagonista y al que sale como detalle.
      out.push({ ...base, kind: "sub", player: e.assist.name ?? "—", detail: e.player.name ?? null });
    } else if (e.type === "Var" && (detail.includes("disallow") || detail.includes("cancel"))) {
      out.push({ ...base, kind: "var_disallowed", player: e.player.name ?? "—", detail: null });
    }
  }
  return out.sort(
    (a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.extra ?? 0) - (b.extra ?? 0),
  );
}

/**
 * Todos los partidos de una competición, con su estado. Cachea 15 min (antes
 * 5 — con 9 competiciones activas, el calendario completo entero se
 * recargaba muy seguido para "Finalizados"/bracket sin necesitarlo; los
 * partidos EN VIVO no pasan por aquí, tienen su propia caché corta en
 * `getCompetitionFixturesWindow`).
 */
/** Clave de sports_cache para el calendario completo de una competición. */
export function allFixturesCacheKey(competition: Competition): string {
  return `allFixtures:${competition.slug}`;
}

export async function getCompetitionAllFixtures(
  competition: Competition,
  opts: { forceLive?: boolean } = {},
): Promise<Fixture[]> {
  const fetchLive = async () =>
    (
      await get<Fixture>(
        "/fixtures",
        { league: competition.leagueId, season: competition.season },
        // 30 min (antes 15): calendario completo de la temporada — cambia solo
        // por aplazamientos puntuales. Respalda getCompetitionFinishedFixtures,
        // llamada desde portada Y /liga/[slug] — bajar su frecuencia a la mitad
        // recorta el fan-out de 9 competiciones sin perder frescura relevante.
        1800,
      )
    ).response;

  // Precalculado por el cron — ver nota en getCompetitionStandings.
  if (opts.forceLive) return fetchLive();
  return cachedOrLive(allFixturesCacheKey(competition), 2400, fetchLive);
}

export function getWorldCupAllFixtures(): Promise<Fixture[]> {
  return getCompetitionAllFixtures(WORLD_CUP_2026);
}

/** Una ronda del cuadro de eliminatorias. */
export type BracketRound = {
  label: string;
  fixtures: Fixture[];
  /** Nº de cruces "por definir" cuando la ronda aún no tiene fixtures. */
  placeholders: number;
};

/**
 * Cuadro de eliminatorias a partir de todos los fixtures de la competición y
 * su `KoStructureEntry[]` (distinta por competición — nº de rondas y equipos
 * varía). Siempre devuelve todas las rondas de la estructura: las que ya
 * tienen partidos con sus fixtures, y las futuras (aún sin sorteo) con
 * `placeholders` = nº de cruces "por definir".
 */
export function competitionBracket(
  fixtures: Fixture[],
  koStructure: KoStructureEntry[],
): BracketRound[] {
  const byKickoff = (a: Fixture, b: Fixture) =>
    new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
  return koStructure.map(({ label, re, slots }) => {
    const fx = fixtures
      .filter((f) => re.test((f.league.round ?? "").trim()))
      .sort(byKickoff);
    return {
      label,
      fixtures: fx,
      placeholders: fx.length === 0 ? slots : 0,
    };
  });
}

export function knockoutBracket(fixtures: Fixture[]): BracketRound[] {
  return competitionBracket(fixtures, WORLD_CUP_2026.koStructure!);
}

/**
 * Historial de un equipo: sus últimos N partidos jugados y los próximos M
 * (cualquier competición — amistosos, Mundial, etc., como en la ficha de la
 * selección). Deriva el nombre/escudo del equipo de las propias fixturas para
 * no gastar una llamada extra a `/teams`. Caché alta (30 min) — un equipo juega
 * cada varios días, así que no hace falta refrescar seguido y ahorra quota.
 */
/** Claves de sports_cache para el historial de un equipo — exportadas para
 * que el cron escriba bajo las mismas claves que lee esta función. Solo se
 * usan para la combinación exacta que pide el calendario de la portada
 * (equipos destacados); otras combinaciones (ficha de equipo) no se cachean
 * y siguen yendo en vivo tal cual siempre. */
export function teamFixturesLastCacheKey(teamId: number, last: number): string {
  return `teamFixturesLast:${teamId}:${last}`;
}
export function teamFixturesNextCacheKey(teamId: number, next: number): string {
  return `teamFixturesNext:${teamId}:${next}`;
}

export async function getTeamFixtures(
  teamId: number,
  opts: {
    last?: number;
    next?: number;
    revalidate?: number;
    forceLive?: boolean;
  } = {},
): Promise<{
  team: { id: number; name: string; logo: string } | null;
  recent: Fixture[];
  upcoming: Fixture[];
}> {
  const last = opts.last ?? 20;
  const next = opts.next ?? 5;
  const rv = opts.revalidate ?? 1800;

  const fetchLast = async () =>
    (await get<Fixture>("/fixtures", { team: teamId, last }, rv)).response;
  const fetchNext = async () =>
    (await get<Fixture>("/fixtures", { team: teamId, next }, rv)).response;

  // Precalculado por el cron para la combinación exacta que usa el
  // calendario de la portada (equipos destacados) — ver nota en
  // getCompetitionStandings. Otras combinaciones (ficha de equipo) caen a
  // la llamada en vivo tal cual siempre.
  const [recentRaw, upcomingRaw] = opts.forceLive
    ? await Promise.all([fetchLast(), fetchNext()])
    : await Promise.all([
        cachedOrLive(teamFixturesLastCacheKey(teamId, last), 2400, fetchLast),
        cachedOrLive(teamFixturesNextCacheKey(teamId, next), 2400, fetchNext),
      ]);

  const recent = recentRaw.sort(
    (a, b) =>
      new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime(),
  );
  const upcoming = upcomingRaw.sort(
    (a, b) =>
      new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime(),
  );

  let team: { id: number; name: string; logo: string } | null = null;
  for (const f of [...recent, ...upcoming]) {
    const side =
      f.teams.home.id === teamId
        ? f.teams.home
        : f.teams.away.id === teamId
          ? f.teams.away
          : null;
    if (side) {
      team = { id: teamId, name: side.name, logo: side.logo };
      break;
    }
  }

  return { team, recent, upcoming };
}

/** Un tramo de minutos (p. ej. "46-60") con total y % de goles/tarjetas. */
export type MinuteBucket = { total: number | null; percentage: string | null };
export type MinuteMap = Record<string, MinuteBucket>;

/**
 * Perfil de temporada de un equipo (endpoint `/teams/statistics`): forma,
 * balance, goles a favor/en contra por tramos de minutos, vallas invictas,
 * mayor racha, formación más usada, penaltis y tarjetas.
 */
export type TeamSeasonStats = {
  league: { id: number; name: string; season: number; logo: string };
  team: { id: number; name: string; logo: string };
  form: string | null;
  fixtures: {
    played: { home: number; away: number; total: number };
    wins: { home: number; away: number; total: number };
    draws: { home: number; away: number; total: number };
    loses: { home: number; away: number; total: number };
  };
  goals: {
    for: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
      minute: MinuteMap;
    };
    against: {
      total: { home: number; away: number; total: number };
      average: { home: string; away: string; total: string };
      minute: MinuteMap;
    };
  };
  biggest: {
    streak: { wins: number; draws: number; loses: number };
    wins: { home: string | null; away: string | null };
    loses: { home: string | null; away: string | null };
    goals: {
      for: { home: number; away: number };
      against: { home: number; away: number };
    };
  };
  clean_sheet: { home: number; away: number; total: number };
  failed_to_score: { home: number; away: number; total: number };
  penalty: {
    scored: { total: number; percentage: string | null };
    missed: { total: number; percentage: string | null };
    total: number;
  };
  lineups: { formation: string; played: number }[];
  cards: { yellow: MinuteMap; red: MinuteMap };
};

/**
 * Estadísticas de temporada de un equipo. Por defecto, del Mundial 2026.
 * `/teams/statistics` devuelve un OBJETO (no un array), así que distinguimos
 * éxito (objeto) de fallo/vacío (`get` devuelve `[]`) → null. Caché 30 min:
 * cambia como mucho tras cada partido de la selección.
 */
export async function getTeamStatistics(
  teamId: number,
  opts: { league?: number; season?: number; revalidate?: number } = {},
): Promise<TeamSeasonStats | null> {
  const league = opts.league ?? WORLD_CUP.leagueId;
  const season = opts.season ?? WORLD_CUP.season;
  const rv = opts.revalidate ?? 1800;
  const r = await get<TeamSeasonStats>(
    "/teams/statistics",
    { league, season, team: teamId },
    rv,
  );
  const resp = r.response as unknown;
  if (!resp || Array.isArray(resp)) return null;
  return resp as TeamSeasonStats;
}

/**
 * Enfrentamientos históricos (head-to-head) entre dos equipos, el más reciente
 * primero. Cachea 1 día — el historial solo cambia cuando vuelven a jugar.
 */
export async function getHeadToHead(
  teamA: number,
  teamB: number,
  opts: { last?: number; revalidate?: number } = {},
): Promise<Fixture[]> {
  const last = opts.last ?? 20;
  const r = await get<Fixture>(
    "/fixtures/headtohead",
    { h2h: `${teamA}-${teamB}`, last },
    opts.revalidate ?? 86400,
  );
  return r.response.sort(
    (a, b) =>
      new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime(),
  );
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

/**
 * Descarta "goles fantasma": un gol anulado por VAR que el proveedor todavía
 * lista como evento, o eventos y marcador desincronizados en directo. Reconcilia
 * contra el marcador REAL (`goals.home/away`, la fuente autoritativa): si un
 * equipo tiene más goles-evento que goles en el marcador, se quitan los más
 * recientes hasta cuadrar. El autogol cuenta para el equipo rival.
 */
export function reconcileGoals(
  goals: FixtureGoal[],
  opts: {
    homeId: number;
    awayId: number;
    scoreHome: number | null;
    scoreAway: number | null;
  },
): FixtureGoal[] {
  const { homeId, awayId, scoreHome, scoreAway } = opts;
  if (scoreHome == null || scoreAway == null) return goals;

  const benef = (g: FixtureGoal): number =>
    g.detail === "Own Goal" ? (g.teamId === homeId ? awayId : homeId) : g.teamId;
  const limit: Record<number, number> = { [homeId]: scoreHome, [awayId]: scoreAway };
  const count: Record<number, number> = { [homeId]: 0, [awayId]: 0 };

  // De más antiguo a más nuevo: conserva hasta 'limit' por equipo beneficiado;
  // así el gol anulado (normalmente el más reciente) es el que se descarta.
  const kept = new Set<FixtureGoal>();
  for (const g of [...goals].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))) {
    const t = benef(g);
    if (limit[t] == null) {
      kept.add(g); // equipo inesperado: no lo tocamos
    } else if (count[t] < limit[t]) {
      count[t]++;
      kept.add(g);
    }
  }
  return goals.filter((g) => kept.has(g));
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

/** Evento notable que NO cuenta en el marcador: penalti fallado o gol anulado. */
export type FixtureNote = {
  minute: number | null;
  teamId: number;
  player: string;
  kind: "missed_penalty" | "disallowed_goal";
};

/**
 * Eventos "de más" que conviene mostrar aunque no sumen al marcador: penaltis
 * fallados (type=Goal, detail "Missed Penalty") y goles anulados por VAR
 * (type=Var, detail con "disallowed"/"cancelled"). Una llamada a
 * /fixtures/events (todos los tipos), con clave de caché propia. Vacío si no hay.
 */
export async function getFixtureNotes(
  id: number,
  revalidate = 600,
): Promise<FixtureNote[]> {
  const r = await get<FixtureEvent>("/fixtures/events", { fixture: id }, revalidate);
  const notes: FixtureNote[] = [];
  for (const e of r.response) {
    const d = (e.detail || "").toLowerCase();
    if (e.type === "Goal" && d === "missed penalty") {
      notes.push({
        minute: e.time.elapsed,
        teamId: e.team.id,
        player: e.player.name ?? "—",
        kind: "missed_penalty",
      });
    } else if (
      e.type === "Var" &&
      (d.includes("disallow") || d.includes("cancel"))
    ) {
      notes.push({
        minute: e.time.elapsed,
        teamId: e.team.id,
        player: e.player.name ?? "—",
        kind: "disallowed_goal",
      });
    }
  }
  return notes.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

/**
 * Clave para casar un jugador entre /events y /lineups (⚠️ sus IDs de jugador
 * NO coinciden, y los nombres varían "M. Cunha" vs "Matheus Cunha"): último
 * apellido, sin tildes, en minúscula.
 */
export function subKey(name: string | null): string {
  if (!name) return "";
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const parts = clean.split(/\s+/);
  return parts[parts.length - 1] || clean;
}

/** Claves (apellido) de quienes ENTRARON y SALIERON en los cambios del partido. */
export type FixtureSubs = { inKeys: string[]; outKeys: string[] };

/**
 * Cambios del partido (type=subst). ⚠️ En API-Football, `player` es quien SALE
 * (titular) y `assist` quien ENTRA (del banco). Como los IDs no casan con
 * /lineups, devolvemos claves por apellido (subKey) para pintar flechas.
 */
export async function getFixtureSubs(
  id: number,
  revalidate = 600,
): Promise<FixtureSubs> {
  const r = await get<FixtureEvent>(
    "/fixtures/events",
    { fixture: id, type: "subst" },
    revalidate,
  );
  const inKeys: string[] = [];
  const outKeys: string[] = [];
  for (const e of r.response) {
    if (e.type !== "subst") continue;
    if (e.assist?.name) inKeys.push(subKey(e.assist.name)); // entra
    if (e.player?.name) outKeys.push(subKey(e.player.name)); // sale
  }
  return { inKeys, outKeys };
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
  competition: Competition = WORLD_CUP_2026,
): Promise<PlayerSeason | null> {
  // Igual que el buscador: en pretemporada la season actual está vacía →
  // caemos a las archivadas para que la ficha muestre datos igualmente.
  const seasons = [competition.season, ...(competition.archivedSeasons ?? [])];
  for (const season of seasons) {
    const r = await get<PlayerSeasonResponse>(
      "/players",
      { id, league: competition.leagueId, season },
      600,
    );
    const p = r.response[0];
    const s = p?.statistics[0];
    if (!p || !s) continue;
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
  return null;
}

/** Palmarés, fichajes y lesiones/sanciones de un jugador (ficha ampliada). */
export type PlayerTrophyGroup = {
  league: string;
  country: string | null;
  /** Años ganados, del más reciente al más antiguo. */
  seasons: string[];
};
export type PlayerTransfer = {
  date: string | null;
  /** Monto o tipo tal cual lo da el API: "€ 45M", "Loan", "Free", "N/A". */
  type: string | null;
  teamIn: { name: string; logo: string } | null;
  teamOut: { name: string; logo: string } | null;
};
export type PlayerSidelined = { type: string; start: string | null; end: string | null };
export type PlayerExtras = {
  trophies: PlayerTrophyGroup[];
  transfers: PlayerTransfer[];
  sidelined: PlayerSidelined[];
};

/** Año "ganado" de una temporada: "2014/2015" → "2015", "2024" → "2024". */
function seasonYear(season: string | null | undefined): string {
  if (!season || typeof season !== "string") return "";
  const years = season.match(/\d{4}/g);
  return years ? years[years.length - 1] : season;
}

type TrophyResp = { league: string; country: string; season: string; place: string };
type TransferResp = {
  transfers: Array<{
    date: string | null;
    type: string | null;
    teams: {
      in: { name: string; logo: string } | null;
      out: { name: string; logo: string } | null;
    };
  }>;
};
type SidelinedResp = { type: string; start: string | null; end: string | null };

/**
 * Datos de carrera de un jugador: palmarés (títulos primero), últimos fichajes
 * e historial de lesiones/sanciones. Tres endpoints en paralelo, cada uno
 * tolerante a fallo. Caché 1 día — son datos históricos que cambian poco.
 */
export async function getPlayerExtras(id: number): Promise<PlayerExtras> {
  const rv = 86400;
  const [tro, tra, sid] = await Promise.all([
    get<TrophyResp>("/trophies", { player: id }, rv).catch(() => ({ response: [] as TrophyResp[] })),
    get<TransferResp>("/transfers", { player: id }, rv).catch(() => ({ response: [] as TransferResp[] })),
    get<SidelinedResp>("/sidelined", { player: id }, rv).catch(() => ({ response: [] as SidelinedResp[] })),
  ]);

  // Agrupamos los títulos por competición: en vez de repetir "Champions League"
  // por cada año, una entrada con todos los años ganados entre paréntesis.
  const byLeague = new Map<string, PlayerTrophyGroup>();
  for (const t of tro.response ?? []) {
    if (!/winner/i.test(t.place)) continue;
    const g =
      byLeague.get(t.league) ??
      { league: t.league, country: t.country ?? null, seasons: [] as string[] };
    const yr = seasonYear(t.season);
    if (yr && !g.seasons.includes(yr)) g.seasons.push(yr);
    byLeague.set(t.league, g);
  }
  const trophies: PlayerTrophyGroup[] = [...byLeague.values()]
    .map((g) => ({ ...g, seasons: g.seasons.sort((a, b) => b.localeCompare(a)) }))
    .sort((a, b) => b.seasons.length - a.seasons.length);

  const transfers: PlayerTransfer[] = ((tra.response?.[0] as TransferResp | undefined)?.transfers ?? [])
    .slice(0, 5)
    .map((t) => ({
      date: t.date,
      type: t.type,
      teamIn: t.teams?.in ? { name: t.teams.in.name, logo: t.teams.in.logo } : null,
      teamOut: t.teams?.out ? { name: t.teams.out.name, logo: t.teams.out.logo } : null,
    }));

  const sidelined: PlayerSidelined[] = (sid.response ?? [])
    .slice(-6)
    .reverse()
    .map((s) => ({ type: s.type, start: s.start, end: s.end }));

  return { trophies, transfers, sidelined };
}

/** Resultado de búsqueda de jugador (nombre + escudo de su selección). */
export type PlayerSearchResult = {
  id: number;
  name: string;
  photo: string | null;
  team: { name: string; logo: string } | null;
};

/**
 * Busca jugadores de una competición por nombre (endpoint `/players?search=`).
 * Requiere ≥3 caracteres. Caché 1h — el índice de jugadores cambia poco.
 *
 * ⚠️ `/players?league&season&search` solo devuelve datos de temporadas ya
 * jugadas: en PRETEMPORADA (p. ej. LaLiga season 2026 antes del 15-ago) está
 * vacío y el buscador no encontraba a nadie. Por eso probamos la season actual
 * y, si no hay resultados, caemos a las `archivedSeasons` (la anterior) —
 * los jugadores son prácticamente los mismos.
 */
export async function searchCompetitionPlayers(
  query: string,
  competition: Competition,
  n = 15,
): Promise<PlayerSearchResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const seasons = [competition.season, ...(competition.archivedSeasons ?? [])];
  for (const season of seasons) {
    const r = await get<PlayerSeasonResponse>(
      "/players",
      { league: competition.leagueId, season, search: q },
      3600,
    );
    if (r.response.length === 0) continue;
    return r.response.slice(0, n).map((p) => {
      const t = p.statistics?.[0]?.team;
      return {
        id: p.player.id,
        name: p.player.name,
        photo: p.player.photo ?? null,
        team: t ? { name: t.name, logo: t.logo } : null,
      };
    });
  }
  return [];
}

export function searchWorldCupPlayers(
  query: string,
  n = 15,
): Promise<PlayerSearchResult[]> {
  return searchCompetitionPlayers(query, WORLD_CUP_2026, n);
}

/** Un jugador de la plantilla de una selección. */
export type SquadPlayer = {
  id: number;
  name: string;
  photo: string | null;
  number: number | null;
  position: string | null;
  age: number | null;
};

type SquadResponse = {
  players: Array<{
    id: number;
    name: string;
    age: number | null;
    number: number | null;
    position: string | null;
    photo: string | null;
  }>;
};

/**
 * Plantilla de una selección (endpoint `/players/squads`). Ordenada por
 * posición (POR, DEF, MED, DEL) y dorsal. Caché 1 día. Vacío si no hay datos.
 */
export async function getTeamSquad(teamId: number): Promise<SquadPlayer[]> {
  const r = await get<SquadResponse>("/players/squads", { team: teamId }, 86400);
  const players = r.response[0]?.players ?? [];
  const order: Record<string, number> = {
    Goalkeeper: 0,
    Defender: 1,
    Midfielder: 2,
    Attacker: 3,
  };
  return players
    .map((p) => ({
      id: p.id,
      name: p.name,
      photo: p.photo ?? null,
      number: p.number ?? null,
      position: p.position ?? null,
      age: p.age ?? null,
    }))
    .sort((a, b) => {
      const po = (order[a.position ?? ""] ?? 9) - (order[b.position ?? ""] ?? 9);
      if (po !== 0) return po;
      return (a.number ?? 99) - (b.number ?? 99);
    });
}

/** Seleccionador / entrenador de un equipo. */
export type Coach = {
  id: number;
  name: string;
  nationality: string | null;
  age: number | null;
  photo: string | null;
};

type CoachCareer = {
  team: { id: number } | null;
  start: string | null;
  end: string | null;
};

type CoachResponse = {
  id: number;
  name: string;
  nationality: string | null;
  age: number | null;
  photo: string | null;
  career?: CoachCareer[];
};

/**
 * Entrenador ACTUAL de un equipo (endpoint `/coachs`). Caché 1 día.
 *
 * ⚠️ `/coachs?team=X` devuelve TODOS los entrenadores ligados al club, incluidos
 * los pasados — `response[0]` NO es necesariamente el actual (por eso salía Xavi
 * en el Barça en vez de Flick). El actual es aquél cuya etapa en ESTE equipo
 * sigue abierta (`career[].end === null`). Si ninguno tiene etapa abierta, se
 * coge el de inicio más reciente en este equipo.
 */
export async function getTeamCoach(teamId: number): Promise<Coach | null> {
  const r = await get<CoachResponse>("/coachs", { team: teamId }, 86400);
  const coaches = r.response;
  if (coaches.length === 0) return null;

  const spellsForTeam = (c: CoachResponse) =>
    (c.career ?? []).filter((e) => e.team?.id === teamId);
  const latestStart = (c: CoachResponse) =>
    spellsForTeam(c)
      .map((e) => e.start ?? "")
      .sort()
      .pop() ?? "";

  // ⚠️ API-Football a veces deja VARIAS etapas abiertas (end==null) a la vez
  // para el mismo club — verificado en el Barça: Xavi (inicio 2021) sigue
  // "abierta" ADEMÁS de Flick (2024) y R. Sánchez (2023). Por eso coger "el
  // primero con etapa abierta" devolvía a Xavi. El actual es, entre los que
  // tienen etapa abierta (o todos si ninguno la tiene), el de INICIO más
  // reciente en este equipo.
  const withOpen = coaches.filter((c) =>
    spellsForTeam(c).some((e) => e.end == null),
  );
  const pool = withOpen.length > 0 ? withOpen : coaches;
  const current =
    [...pool].sort((a, b) => latestStart(b).localeCompare(latestStart(a)))[0] ??
    coaches[0];

  const c = current;
  return {
    id: c.id,
    name: c.name,
    nationality: c.nationality ?? null,
    age: c.age ?? null,
    photo: c.photo ?? null,
  };
}

/** Un jugador del listado global (todas las plantillas del Mundial). */
export type AllPlayer = {
  id: number;
  name: string;
  photo: string | null;
  position: string | null;
  team: { name: string; logo: string } | null;
};

/**
 * Enumera los equipos de una competición a partir de su tabla (plana o por
 * grupos). Si no tiene tabla (`standingsMode: "none"`, torneos de puro KO
 * como Copa del Rey/FA Cup/Supercopa), los deriva de todos los fixtures
 * (equipos local/visitante) en su lugar — sin esto, esas competiciones se
 * quedarían sin pestaña "Jugadores" (sin equipos que enumerar).
 */
async function getCompetitionTeamRefs(
  competition: Competition,
): Promise<{ id: number; name: string; logo: string }[]> {
  const standings = await getCompetitionStandings(competition);
  const map = new Map<number, { id: number; name: string; logo: string }>();

  if (!standings) {
    const fixtures = await getCompetitionAllFixtures(competition);
    for (const f of fixtures) {
      if (!map.has(f.teams.home.id)) map.set(f.teams.home.id, f.teams.home);
      if (!map.has(f.teams.away.id)) map.set(f.teams.away.id, f.teams.away);
    }
    return [...map.values()];
  }

  const rows: StandingRow[] =
    competition.standingsMode === "groups"
      ? (standings as WcGroup[]).flatMap((g) => g.rows)
      : (standings as StandingRow[]);
  for (const row of rows) if (!map.has(row.team.id)) map.set(row.team.id, row.team);
  return [...map.values()];
}

/**
 * Todos los jugadores de una competición agregando las PLANTILLAS completas de
 * sus equipos (`/players/squads` → hasta 26 por equipo, a diferencia de
 * `/players` que solo trae a los que ya jugaron). Los squads se piden POR
 * LOTES de 5 para no chocar con el rate-limit (todos en paralelo devolvían
 * plantillas vacías). Cada squad va cacheado 1 día.
 */
export async function getAllCompetitionPlayers(
  competition: Competition,
): Promise<AllPlayer[]> {
  const teamRefs = await getCompetitionTeamRefs(competition);
  const teams = new Map<number, { name: string; logo: string }>();
  for (const t of teamRefs) teams.set(t.id, { name: t.name, logo: t.logo });

  const ids = [...teams.keys()];
  const result = new Map<number, SquadPlayer[]>();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Pide las plantillas en lotes pequeños con un respiro entre ellos para no
  // saturar el rate-limit por segundo. Solo guardamos las no vacías.
  const runBatches = async (batchIds: number[], size: number, gap: number) => {
    for (let i = 0; i < batchIds.length; i += size) {
      const chunk = batchIds.slice(i, i + size);
      const res = await Promise.all(
        chunk.map((id) =>
          getTeamSquad(id)
            .then((sq) => ({ id, sq }))
            .catch(() => ({ id, sq: [] as SquadPlayer[] })),
        ),
      );
      for (const { id, sq } of res) if (sq.length) result.set(id, sq);
      if (i + size < batchIds.length) await sleep(gap);
    }
  };

  await runBatches(ids, 5, 150);
  // Reintento de las selecciones que volvieron vacías (rate-limit transitorio).
  const missing = ids.filter((id) => !result.has(id));
  if (missing.length) await runBatches(missing, 3, 250);

  const seen = new Set<number>();
  const out: AllPlayer[] = [];
  for (const [id, sq] of result) {
    const team = teams.get(id) ?? null;
    for (const p of sq) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({ id: p.id, name: p.name, photo: p.photo, position: p.position, team });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function getAllWorldCupPlayers(): Promise<AllPlayer[]> {
  return getAllCompetitionPlayers(WORLD_CUP_2026);
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
 * Goleadores, asistidores y valoraciones del Mundial desde el agregado OFICIAL
 * de API-Football (`/players/topscorers` + `/players/topassists`). Es el ranking
 * canónico y fiable: a mitad de torneo consolida en pocas horas.
 *
 * (Antes se calculaba desde los EVENTOS de cada partido para tenerlo casi en
 * vivo, pero dependía de la caché larga de eventos completos y dejaba fuera
 * goles de partidos recientes — p. ej. un hat-trick no aparecía al día
 * siguiente. Se descartó por fiabilidad; la frescura en vivo ya la dan la
 * pestaña "Marcador en vivo" y el detalle de partido.)
 */
export async function getCompetitionPlayerStats(
  competition: Competition,
  n = 10,
): Promise<{
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  ratings: PlayerStatLeader[];
  cards: PlayerStatLeader[];
}> {
  const [scorersAll, assistsAll, cardsAll] = await Promise.all([
    getCompetitionTopScorers(competition, 40),
    getCompetitionTopAssists(competition, 40),
    getCompetitionTopYellowCards(competition, n).catch(() => [] as PlayerStatLeader[]),
  ]);
  return {
    scorers: scorersAll.slice(0, n),
    assists: assistsAll.slice(0, n),
    ratings: ratingLeaders(scorersAll, assistsAll, n),
    cards: cardsAll.slice(0, n),
  };
}

export function getWorldCupPlayerStats(n = 10): Promise<{
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  ratings: PlayerStatLeader[];
  cards: PlayerStatLeader[];
}> {
  return getCompetitionPlayerStats(WORLD_CUP_2026, n);
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
 * Mejor ataque / mejor defensa del torneo COMPLETO (grupos + eliminatorias),
 * agregando goles a favor/en contra de todos los partidos TERMINADOS. La
 * clasificación (`/standings`) solo cubre la fase de grupos, así que en cuanto
 * empiezan las eliminatorias hay que derivarlo de los fixtures para no dar
 * cifras congeladas en la fase de grupos. Los penaltis (tanda) no cuentan:
 * `goals` es el marcador al final de la prórroga.
 */
export function teamAttackDefenseFromFixtures(fixtures: Fixture[]): {
  attack: StandingRow[];
  defense: StandingRow[];
} {
  type Agg = {
    team: { id: number; name: string; logo: string };
    played: number;
    gf: number;
    ga: number;
  };
  const map = new Map<number, Agg>();
  const bump = (
    team: { id: number; name: string; logo: string },
    gf: number,
    ga: number,
  ) => {
    const a =
      map.get(team.id) ??
      { team: { id: team.id, name: team.name, logo: team.logo }, played: 0, gf: 0, ga: 0 };
    a.played += 1;
    a.gf += gf;
    a.ga += ga;
    map.set(team.id, a);
  };
  for (const f of fixtures) {
    if (!isFinal(f)) continue;
    const hg = f.goals.home ?? 0;
    const ag = f.goals.away ?? 0;
    bump(f.teams.home, hg, ag);
    bump(f.teams.away, ag, hg);
  }
  const rows: StandingRow[] = [...map.values()].map((a) => ({
    rank: 0,
    team: a.team,
    points: 0,
    goalsDiff: a.gf - a.ga,
    all: {
      played: a.played,
      win: 0,
      draw: 0,
      lose: 0,
      goals: { for: a.gf, against: a.ga },
    },
    form: null,
  }));
  if (rows.length === 0) return { attack: [], defense: [] };
  const attack = [...rows].sort((a, b) => b.all.goals.for - a.all.goals.for).slice(0, 5);
  const defense = [...rows]
    .sort((a, b) => a.all.goals.against - b.all.goals.against)
    .slice(0, 5);
  return { attack, defense };
}

/** Récords agregados del torneo, derivados de los partidos ya jugados. */
export type TournamentRecords = {
  /** Partido con mayor diferencia de goles (la mayor goleada). */
  biggestWin: Fixture | null;
  /** Partido con más goles en total. */
  mostGoals: Fixture | null;
  totalGoals: number;
  matchesPlayed: number;
  /** Media de goles por partido (2 decimales al mostrar). */
  avgGoals: number;
  /** Nº de partidos resueltos en tanda de penaltis. */
  penShootouts: number;
  /** Nº de partidos sin goles (0-0 al final del tiempo reglamentario/prórroga). */
  scorelessDraws: number;
};

/**
 * Récords del Mundial a partir de los partidos TERMINADOS: mayor goleada,
 * partido con más goles, total y media, tandas de penaltis. Cero llamadas
 * extra — solo agrega los fixtures que ya tenemos.
 */
export function tournamentRecords(finished: Fixture[]): TournamentRecords {
  let biggestWin: Fixture | null = null;
  let mostGoals: Fixture | null = null;
  let totalGoals = 0;
  let penShootouts = 0;
  let scorelessDraws = 0;
  let maxMargin = -1;
  let maxTotal = -1;
  for (const f of finished) {
    const h = f.goals.home ?? 0;
    const a = f.goals.away ?? 0;
    const total = h + a;
    totalGoals += total;
    if (f.fixture.status.short === "PEN") penShootouts++;
    if (total === 0) scorelessDraws++;
    const margin = Math.abs(h - a);
    if (margin > maxMargin) {
      maxMargin = margin;
      biggestWin = f;
    }
    if (total > maxTotal) {
      maxTotal = total;
      mostGoals = f;
    }
  }
  const matchesPlayed = finished.length;
  return {
    biggestWin: maxMargin > 0 ? biggestWin : null,
    mostGoals: maxTotal > 0 ? mostGoals : null,
    totalGoals,
    matchesPlayed,
    avgGoals: matchesPlayed ? totalGoals / matchesPlayed : 0,
    penShootouts,
    scorelessDraws,
  };
}

/** Un récord de juego: el mejor registro (posesión, tiros…) y en qué partido. */
export type GameRecord = {
  fixtureId: number;
  team: { name: string; logo: string };
  rival: { name: string; logo: string };
  value: number;
  /** Marcador del partido, p. ej. "3-1". */
  score: string;
} | null;

export type GameRecords = {
  topPossession: GameRecord;
  topShots: GameRecord;
  topShotsOnTarget: GameRecord;
};

/** Lee un número de la lista de estadísticas del partido ("55%", "14"…). */
function statNum(stats: { type: string; value: number | string | null }[], re: RegExp): number | null {
  const s = stats.find((x) => re.test(x.type));
  if (!s || s.value == null) return null;
  const n = parseFloat(String(s.value).replace("%", ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Récords de juego (más posesión, más tiros, más tiros a puerta por un equipo
 * en un partido) agregando `/fixtures/statistics` de los partidos TERMINADOS.
 * Es 1 llamada por partido → se piden POR LOTES de 6 (cacheadas 1 día, porque
 * las stats de un partido acabado no cambian).
 */
export async function getGameRecords(finished: Fixture[]): Promise<GameRecords> {
  const ids = finished.map((f) => f.fixture.id);
  const byFixture = new Map(finished.map((f) => [f.fixture.id, f]));

  const statsByFixture: { id: number; stats: TeamStatistics[] }[] = [];
  const BATCH = 6;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const res = await Promise.all(
      chunk.map((id) =>
        getFixtureStatistics(id, 86400)
          .then((stats) => ({ id, stats }))
          .catch(() => ({ id, stats: [] as TeamStatistics[] })),
      ),
    );
    statsByFixture.push(...res);
  }

  let topPossession: GameRecord = null;
  let topShots: GameRecord = null;
  let topShotsOnTarget: GameRecord = null;

  const consider = (
    current: GameRecord,
    fx: Fixture,
    teamId: number,
    teamInfo: { name: string; logo: string },
    value: number | null,
  ): GameRecord => {
    if (value == null) return current;
    if (current && value <= current.value) return current;
    const isHome = fx.teams.home.id === teamId;
    const rival = isHome ? fx.teams.away : fx.teams.home;
    return {
      fixtureId: fx.fixture.id,
      team: teamInfo,
      rival: { name: rival.name, logo: rival.logo },
      value,
      score: `${fx.goals.home ?? 0}-${fx.goals.away ?? 0}`,
    };
  };

  for (const { id, stats } of statsByFixture) {
    const fx = byFixture.get(id);
    if (!fx || stats.length === 0) continue;
    for (const t of stats) {
      const info = { name: t.team.name, logo: t.team.logo };
      topPossession = consider(topPossession, fx, t.team.id, info, statNum(t.statistics, /ball possession/i));
      topShots = consider(topShots, fx, t.team.id, info, statNum(t.statistics, /^total shots$/i));
      topShotsOnTarget = consider(topShotsOnTarget, fx, t.team.id, info, statNum(t.statistics, /shots on goal/i));
    }
  }

  return { topPossession, topShots, topShotsOnTarget };
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

// ============================================================================
//  Previa del partido: predicción, lesiones/bajas y cuotas
// ============================================================================

function pctToNum(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(String(s).replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Traduce el `advice` de /predictions (viene en inglés) a español. Los nombres
 * de equipo van tal cual los da el API (el detalle de partido también los usa
 * así), solo se traducen las plantillas. Ej: "Combo Double chance : X or draw
 * and -3.5 goals" → "Doble oportunidad: X o empate · menos de 3.5 goles".
 */
function translateAdvice(advice: string | null): string | null {
  if (!advice) return null;
  let s = advice.trim();
  if (/no (winner )?prediction|no predictions? available/i.test(s)) {
    return "Sin favorito claro";
  }
  s = s.replace(/^Combo\s+/i, "");
  s = s.replace(/\s+and\s+/gi, " · ");
  s = s.replace(/Double chance\s*:\s*/i, "Doble oportunidad: ");
  s = s.replace(/Winner\s*:\s*/i, "Gana ");
  s = s.replace(/\bor draw\b/gi, "o empate");
  s = s.replace(
    /([+-])(\d+(?:\.\d+)?)\s*goals?/gi,
    (_, sign: string, num: string) =>
      `${sign === "-" ? "menos" : "más"} de ${num} goles`,
  );
  return s;
}

/** Probabilidades (0-100) y consejo del partido (endpoint /predictions). */
export type MatchPrediction = {
  percent: { home: number; draw: number; away: number };
  advice: string | null;
  winnerName: string | null;
  winnerComment: string | null;
  /** Forma reciente comparada (0-100) si el API la da. */
  form: { home: number; away: number } | null;
  /** Nombres EN de los equipos (para poder localizarlos en advice/winnerName). */
  teamsEn: { home: string | null; away: string | null };
};

type PredictionsResponse = {
  predictions: {
    winner: { id: number | null; name: string | null; comment: string | null } | null;
    advice: string | null;
    percent: { home: string; draw: string; away: string };
  };
  comparison?: { form?: { home: string; away: string } };
  teams?: { home?: { name: string }; away?: { name: string } };
};

/** Predicción del partido. Caché 30 min (se afina al acercarse el kickoff). */
export async function getFixturePredictions(
  id: number,
  revalidate = 1800,
): Promise<MatchPrediction | null> {
  const r = await get<PredictionsResponse>("/predictions", { fixture: id }, revalidate);
  const p = r.response[0];
  if (!p?.predictions?.percent) return null;
  const pct = p.predictions.percent;
  const form = p.comparison?.form;
  return {
    percent: { home: pctToNum(pct.home), draw: pctToNum(pct.draw), away: pctToNum(pct.away) },
    advice: translateAdvice(p.predictions.advice ?? null),
    winnerName: p.predictions.winner?.name ?? null,
    winnerComment: p.predictions.winner?.comment ?? null,
    form: form ? { home: pctToNum(form.home), away: pctToNum(form.away) } : null,
    teamsEn: {
      home: p.teams?.home?.name ?? null,
      away: p.teams?.away?.name ?? null,
    },
  };
}

/** Una baja (lesión/sanción) de un partido. */
export type Injury = {
  playerId: number;
  player: string;
  photo: string | null;
  teamId: number;
  /** "Missing Fixture" (baja segura) | "Questionable" (duda). */
  type: string | null;
  /** "Injury" | "Suspended" | … */
  reason: string | null;
};

type InjuriesResponse = {
  player: { id: number; name: string; photo: string | null; type: string | null; reason: string | null };
  team: { id: number };
};

/** Bajas (lesiones/sanciones) del partido. Caché 30 min. */
export async function getFixtureInjuries(
  id: number,
  revalidate = 1800,
): Promise<Injury[]> {
  const r = await get<InjuriesResponse>("/injuries", { fixture: id }, revalidate);
  return r.response.map((x) => ({
    playerId: x.player.id,
    player: x.player.name,
    photo: x.player.photo ?? null,
    teamId: x.team.id,
    type: x.player.type ?? null,
    reason: x.player.reason ?? null,
  }));
}

/** Cuotas de varios mercados de la primera casa disponible. */
export type MatchOdds = {
  bookmaker: string;
  /** 1X2 (Match Winner). */
  home: number | null;
  draw: number | null;
  away: number | null;
  /** Más/menos 2.5 goles. null si la casa no lo ofrece. */
  overUnder: { over: number | null; under: number | null } | null;
  /** Ambos equipos marcan (sí/no). */
  btts: { yes: number | null; no: number | null } | null;
  /** Doble oportunidad (1X / 12 / X2). */
  doubleChance: {
    homeOrDraw: number | null;
    homeOrAway: number | null;
    drawOrAway: number | null;
  } | null;
};

type OddsResponse = {
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{ id: number; name: string; values: Array<{ value: string; odd: string }> }>;
  }>;
};

/**
 * Cuotas 1X2 del partido (endpoint /odds, solo pre-partido). Toma la primera
 * casa con el mercado "Match Winner" (bet=1). Caché 30 min. null si no hay.
 * ⚠️ No mostrar dentro de la app nativa (política "no gambling" de las stores);
 * el endpoint /api/sports/preview lo omite con isAppRequest().
 */
export async function getFixtureOdds(
  id: number,
  revalidate = 1800,
): Promise<MatchOdds | null> {
  // Sin `bet` → la casa devuelve todos sus mercados; extraemos los que usamos.
  const r = await get<OddsResponse>("/odds", { fixture: id }, revalidate);
  const book = r.response[0]?.bookmakers?.[0];
  if (!book) return null;

  type Bet = OddsResponse["bookmakers"][number]["bets"][number];
  const betBy = (re: RegExp): Bet | undefined => book.bets.find((b) => re.test(b.name));
  const oddOf = (bet: Bet | undefined, label: RegExp): number | null => {
    const v = bet?.values.find((x) => label.test(x.value.trim()));
    const n = v ? parseFloat(v.odd) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  const mw = betBy(/match winner|full time result|1x2/i);
  if (!mw) return null; // sin 1X2 no montamos el panel

  const ou = betBy(/goals over\/under|^over\/under$/i);
  const btts = betBy(/both teams (to )?score/i);
  const dc = betBy(/double chance/i);

  const overUnder =
    ou && (oddOf(ou, /^over 2\.5$/i) != null || oddOf(ou, /^under 2\.5$/i) != null)
      ? { over: oddOf(ou, /^over 2\.5$/i), under: oddOf(ou, /^under 2\.5$/i) }
      : null;
  const bttsOdds = btts
    ? { yes: oddOf(btts, /^yes$/i), no: oddOf(btts, /^no$/i) }
    : null;
  const doubleChance = dc
    ? {
        homeOrDraw: oddOf(dc, /home\/draw|^1x$/i),
        homeOrAway: oddOf(dc, /home\/away|^12$/i),
        drawOrAway: oddOf(dc, /draw\/away|^x2$/i),
      }
    : null;

  return {
    bookmaker: book.name,
    home: oddOf(mw, /^home$|^1$/i),
    draw: oddOf(mw, /^draw$|^x$/i),
    away: oddOf(mw, /^away$|^2$/i),
    overUnder,
    btts: bttsOdds && (bttsOdds.yes != null || bttsOdds.no != null) ? bttsOdds : null,
    doubleChance,
  };
}
