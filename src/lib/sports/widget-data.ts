import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  TEAM_IDS,
  getCompetitionFinishedFixtures,
  getCompetitionFixturesWindow,
  getFixtureCards,
  getFixtureGoals,
  getRelevantFixtureForTeam,
  getWorldCupFixturesWindow,
  getWorldCupUpcomingFixtures,
  isFinal,
  isLive,
  isWorldCupActive,
  reconcileGoals,
  type Fixture,
  type FixtureCard,
  type FixtureGoal,
} from "./api-football";
import type { Competition } from "./competitions";

export type WidgetMode = "wc" | "clubs";

/** Goles y expulsiones de un partido, para pintarlos en la tarjeta. */
export type FixtureEvents = { goals: FixtureGoal[]; reds: FixtureCard[] };

/** Nombre en español + bandera de un equipo (de nuestra tabla `teams`). */
export type TeamEs = { name: string; flag: string | null };
export type FixtureEs = { home: TeamEs; away: TeamEs };

/**
 * Un fixture con sus eventos adjuntos (null si no está en juego ni terminado)
 * y, si lo conocemos, los nombres en español + banderas (`es`). API-Football
 * devuelve los nombres en inglés; `es` los traduce vía nuestra tabla `teams`.
 */
export type WcFixture = Fixture & {
  ev: FixtureEvents | null;
  es?: FixtureEs;
};

/** Partido próximo, en versión ligera para la lista del widget grande. */
export type WidgetNextFixture = {
  id: number;
  ts: number; // kickoff en segundos epoch
  home: { name: string; logo: string };
  away: { name: string; logo: string };
};

export type WidgetData = {
  mode: WidgetMode;
  fixtures: WcFixture[];
  /** Próximos partidos (para el widget grande de la app). Solo en modo "wc". */
  next?: WidgetNextFixture[];
  /** True if some fixture is live or starts within ~30 min — gate cliente para polling. */
  needsPolling: boolean;
};

const POLL_LEAD_MS = 30 * 60 * 1000; // 30 min antes del kickoff

function shouldPoll(fixtures: Fixture[]): boolean {
  const now = Date.now();
  return fixtures.some((f) => {
    if (isLive(f)) return true;
    if (isFinal(f)) return false;
    const ko = new Date(f.fixture.date).getTime();
    return ko - now < POLL_LEAD_MS && ko - now > -3 * 60 * 60 * 1000;
  });
}

function orderForDisplay(fixtures: Fixture[]): Fixture[] {
  return [...fixtures].sort((a, b) => {
    const score = (f: Fixture) => (isLive(f) ? 0 : isFinal(f) ? 2 : 1);
    const s = score(a) - score(b);
    if (s !== 0) return s;
    return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
  });
}

/**
 * Adjunta goles y expulsiones a los partidos en juego/terminados. Los demás
 * (próximos) van con `ev: null`. Caché corta para los live (15s), larga para
 * los terminados (600s).
 */
export async function attachEvents(fixtures: Fixture[]): Promise<WcFixture[]> {
  return Promise.all(
    fixtures.map(async (f): Promise<WcFixture> => {
      if (!isLive(f) && !isFinal(f)) return { ...f, ev: null };
      const rv = isLive(f) ? 15 : 600;
      try {
        const [rawGoals, cards] = await Promise.all([
          getFixtureGoals(f.fixture.id, rv),
          getFixtureCards(f.fixture.id, rv),
        ]);
        // Descarta goles anulados/fantasma reconciliando con el marcador real.
        const goals = reconcileGoals(rawGoals, {
          homeId: f.teams.home.id,
          awayId: f.teams.away.id,
          scoreHome: f.goals.home,
          scoreAway: f.goals.away,
        });
        return { ...f, ev: { goals, reds: cards.filter((c) => c.expulsion) } };
      } catch {
        return { ...f, ev: null };
      }
    }),
  );
}

/**
 * Mapa fixtureId → nombres ES + banderas, cruzando `matches.api_football_fixture_id`
 * con `teams`. Cacheado 30 min (los equipos cambian poco; al resolverse un
 * cruce de eliminatoria tarda como mucho eso en reflejarse el nombre ES).
 * Es un par de queries baratas (teams = 48 filas) → coste de CPU ínfimo.
 */
export const loadEsMap = unstable_cache(
  async (fixtureIds: number[]): Promise<Record<number, FixtureEs>> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || fixtureIds.length === 0) return {};
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const [matchesRes, teamsRes] = await Promise.all([
      supabase
        .from("matches")
        .select("api_football_fixture_id, team_home, team_away")
        .in("api_football_fixture_id", fixtureIds),
      supabase.from("teams").select("id, name, flag_emoji"),
    ]);
    const matches = matchesRes.data;
    const teams = teamsRes.data;
    if (!matches || !teams) return {};
    const byId = new Map<string, TeamEs>(
      teams.map((t) => [t.id, { name: t.name, flag: t.flag_emoji ?? null }]),
    );
    const out: Record<number, FixtureEs> = {};
    for (const m of matches) {
      const fid = m.api_football_fixture_id;
      if (fid == null) continue;
      const home = m.team_home ? byId.get(m.team_home) : undefined;
      const away = m.team_away ? byId.get(m.team_away) : undefined;
      if (home && away) out[fid] = { home, away };
    }
    return out;
  },
  ["widget-es-names"],
  { revalidate: 1800 },
);

/** Adjunta los nombres en español (si los tenemos) a cada fixture. */
async function attachEsNames(fixtures: WcFixture[]): Promise<WcFixture[]> {
  try {
    const map = await loadEsMap(fixtures.map((f) => f.fixture.id));
    return fixtures.map((f) => {
      const es = map[f.fixture.id];
      return es ? { ...f, es } : f;
    });
  } catch {
    return fixtures;
  }
}

/** Próximos N partidos del Mundial en versión ligera (nombre ES + escudo + hora). */
async function buildNext(): Promise<WidgetNextFixture[]> {
  try {
    const upcoming = await getWorldCupUpcomingFixtures(6);
    const esMap = await loadEsMap(upcoming.map((f) => f.fixture.id));
    return upcoming.map((f) => {
      const es = esMap[f.fixture.id];
      return {
        id: f.fixture.id,
        ts: Math.floor(new Date(f.fixture.date).getTime() / 1000),
        home: { name: es?.home.name ?? f.teams.home.name, logo: f.teams.home.logo },
        away: { name: es?.away.name ?? f.teams.away.name, logo: f.teams.away.logo },
      };
    });
  } catch {
    return [];
  }
}

export async function getWidgetData(): Promise<WidgetData> {
  if (isWorldCupActive()) {
    const [fixtures, next] = await Promise.all([
      attachEsNames(
        await attachEvents(orderForDisplay(await getWorldCupFixturesWindow())),
      ),
      buildNext(),
    ]);
    return { mode: "wc", fixtures, next, needsPolling: shouldPoll(fixtures) };
  }

  const [barca, madrid] = await Promise.all([
    getRelevantFixtureForTeam(TEAM_IDS.barcelona),
    getRelevantFixtureForTeam(TEAM_IDS.realMadrid),
  ]);

  // Si Barça y Madrid juegan el mismo partido (Clásico), evitamos pintarlo dos
  // veces.
  const seen = new Set<number>();
  const base: Fixture[] = [];
  for (const f of [barca, madrid]) {
    if (!f) continue;
    if (seen.has(f.fixture.id)) continue;
    seen.add(f.fixture.id);
    base.push(f);
  }
  const fixtures = await attachEvents(base);
  return { mode: "clubs", fixtures, needsPolling: shouldPoll(fixtures) };
}

/* ---------------------------------------------------------------------- *
 * Widget de portada multi-competición (PR6). Añadido sin tocar nada de lo
 * de arriba: getWidgetData()/WidgetData/WidgetMode siguen intactos y los
 * sigue usando /mundial (vía /api/sports/widget) tal cual.
 * ---------------------------------------------------------------------- */

/** Un fixture de la portada, con la competición a la que pertenece (para
 * poder mezclar LaLiga + Champions y aun así saber de cuál es cada uno). */
export type HomeFixture = WcFixture & {
  competition: { slug: string; name: string };
};

/**
 * Partidos de UNA competición para el widget de portada. Separados por
 * competición (en vez de una lista única mezclada) para que, con varias
 * ligas activas a la vez, no se confundan los partidos de una con los de
 * otra — cada una va en su propio desplegable en la UI.
 */
export type CompetitionGroup = {
  competition: { slug: string; name: string };
  /** Partidos en juego ahora mismo. */
  live: HomeFixture[];
  /** Partidos de "hoy" que no están en vivo (próximos en la ventana). */
  today: HomeFixture[];
  /** Últimos resultados finalizados, más reciente primero. */
  recentResults: HomeFixture[];
};

export type HomeWidgetData = {
  /** Una entrada por competición con algo que enseñar (se omiten las vacías). */
  groups: CompetitionGroup[];
  /** True si alguna competición tiene algo en juego o a punto de empezar. */
  needsPolling: boolean;
};

function tagCompetition<T extends Fixture>(
  fixtures: T[],
  competition: Competition,
): (T & { competition: { slug: string; name: string } })[] {
  return fixtures.map((f) => ({
    ...f,
    competition: { slug: competition.slug, name: competition.name },
  }));
}

/** Mismo criterio que `orderForDisplay` (en vivo primero, luego por kickoff),
 * reimplementado porque esa función es privada del módulo y esta versión
 * necesita preservar el campo `competition` en el tipo de salida. */
function orderHomeForDisplay(fixtures: HomeFixture[]): HomeFixture[] {
  return [...fixtures].sort((a, b) => {
    const score = (f: Fixture) => (isLive(f) ? 0 : isFinal(f) ? 2 : 1);
    const s = score(a) - score(b);
    if (s !== 0) return s;
    return new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();
  });
}

/**
 * Datos para el widget de la portada (PR6, reagrupado tras feedback del
 * dueño: con varias ligas a la vez, mezclarlas en una sola lista confundía
 * — ahora una `CompetitionGroup` por competición, cada una con su propio
 * en vivo/hoy/resultados). Pasa siempre por las funciones `get()`-wrapped/
 * `unstable_cache`-backed de `api-football.ts` — cero `fetch` crudo nuevo.
 */
export async function getHomeWidgetData(
  competitions: Competition[],
): Promise<HomeWidgetData> {
  const groups = await Promise.all(
    competitions.map(async (c): Promise<CompetitionGroup> => {
      const [windowRaw, resultsRaw] = await Promise.all([
        getCompetitionFixturesWindow(c),
        getCompetitionFinishedFixtures(c, 4),
      ]);

      const windowTagged = tagCompetition(windowRaw, c);
      const windowWithEvents = await attachEvents(windowTagged);
      const today = orderHomeForDisplay(
        windowWithEvents.map((f, i) => ({ ...f, competition: windowTagged[i].competition })),
      ).filter((f) => !isFinal(f));
      const live = today.filter(isLive);

      const resultsTagged = tagCompetition(resultsRaw, c)
        .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
        .slice(0, 4);
      const resultsWithEvents = await attachEvents(resultsTagged);
      const recentResults = resultsWithEvents.map((f, i) => ({
        ...f,
        competition: resultsTagged[i].competition,
      }));

      return { competition: { slug: c.slug, name: c.name }, live, today, recentResults };
    }),
  );

  // Solo las competiciones con algo real que enseñar.
  const nonEmpty = groups.filter(
    (g) => g.live.length + g.today.length + g.recentResults.length > 0,
  );
  // Reutiliza `shouldPoll` (privada de este mismo archivo, sin tocarla).
  const needsPolling = nonEmpty.some((g) => shouldPoll(g.today));

  return { groups: nonEmpty, needsPolling };
}
