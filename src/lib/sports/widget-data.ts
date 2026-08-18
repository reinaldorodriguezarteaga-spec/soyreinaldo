import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  TEAM_IDS,
  getCompetitionFinishedFixtures,
  getCompetitionFixturesWindow,
  getCompetitionUpcomingFixtures,
  getExtraLeagueUpcoming,
  getFixtureCards,
  getFixtureGoals,
  getRelevantFixtureForTeam,
  getTeamFixtures,
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
import {
  CALENDAR_EXTRA_LEAGUES,
  type Competition,
  type FeaturedTeam,
} from "./competitions";

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
  /** Finalizados HOY (huso Europe/Madrid), más reciente primero. Los
   * próximos por jugarse ya no van aquí — viven en la pestaña Calendario. */
  finishedToday: HomeFixture[];
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
 * — ahora una `CompetitionGroup` por competición). Solo en vivo o finalizado
 * HOY (feedback posterior: con `getCompetitionFinishedFixtures(c, 4)` de
 * antes, una competición de cadencia lenta —copas, fase de grupos— podía
 * enseñar resultados de hace semanas; los próximos por jugarse, que antes
 * también salían aquí, ahora viven solo en la pestaña Calendario, sin
 * duplicar contenido entre las dos). Pasa siempre por las funciones
 * `get()`-wrapped/`unstable_cache`-backed de `api-football.ts` — cero
 * `fetch` crudo nuevo.
 */
export async function getHomeWidgetData(
  competitions: Competition[],
): Promise<HomeWidgetData> {
  const todayKey = madridDateKey(new Date());

  const results = await Promise.all(
    competitions.map(async (c) => {
      const [windowRaw, finishedRaw] = await Promise.all([
        getCompetitionFixturesWindow(c),
        getCompetitionFinishedFixtures(c),
      ]);

      const windowTagged = tagCompetition(windowRaw, c);
      const windowWithEvents = await attachEvents(windowTagged);
      const windowFull = orderHomeForDisplay(
        windowWithEvents.map((f, i) => ({ ...f, competition: windowTagged[i].competition })),
      );
      const live = windowFull.filter(isLive);

      const finishedTodayRaw = tagCompetition(
        finishedRaw.filter((f) => madridDateKey(new Date(f.fixture.date)) === todayKey),
        c,
      ).sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());
      const finishedTodayEvents = await attachEvents(finishedTodayRaw);
      const finishedToday = finishedTodayEvents.map((f, i) => ({
        ...f,
        competition: finishedTodayRaw[i].competition,
      }));

      const group: CompetitionGroup = { competition: { slug: c.slug, name: c.name }, live, finishedToday };
      // Reutiliza `shouldPoll` sobre la ventana COMPLETA (incluye próximos a
      // punto de empezar, aunque ya no se muestren aquí) — así el widget
      // arranca a pollear antes de que un partido se ponga en vivo, no
      // después de perdérselo.
      return { group, poll: shouldPoll(windowFull) };
    }),
  );

  // Solo las competiciones con algo real que enseñar.
  const nonEmpty = results.filter((r) => r.group.live.length + r.group.finishedToday.length > 0);
  const needsPolling = nonEmpty.some((r) => r.poll);

  return { groups: nonEmpty.map((r) => r.group), needsPolling };
}

/* ---------------------------------------------------------------------- *
 * Calendario de próximos partidos de la portada: combina las próximas
 * fixturas de las 9 competiciones configuradas CON los amistosos (u otras
 * competiciones no configuradas) de los equipos destacados, en una única
 * lista cronológica agrupada por día. Pensado para la pretemporada: cuando
 * casi todas las competiciones están paradas, el desplegable por competición
 * de arriba (`getHomeWidgetData`, intacto) no da una buena foto de "qué se
 * juega pronto" — esto sí. Añadido sin tocar nada de lo de arriba.
 * ---------------------------------------------------------------------- */

const MADRID_TZ = "Europe/Madrid";
/** Id de la liga especial "Friendlies Clubs" de API-Football: amistosos de
 * clubes, cubre a todos los equipos — no es una `Competition` nuestra. */
const FRIENDLIES_LEAGUE_ID = 667;
/** Competiciones UEFA cuyas rondas previas se excluyen del calendario. */
const UEFA_SLUGS = new Set(["champions", "europa", "conference"]);
/** Selección juvenil (U17/U20/U21…) o femenina — para `seniorOnly`. */
function isYouthOrWomenTeam(name: string): boolean {
  return /\bU-?\d{1,2}\b/i.test(name) || /\sW$/.test(name);
}
/** Techo de fixturas totales del calendario (across todas las fuentes), para
 * que la sección no crezca sin límite en temporada alta con las 9 ligas
 * activas a la vez. */
const CALENDAR_MAX_FIXTURES = 40;

/** Un fixture del calendario, con la etiqueta de competición a mostrar y el
 * slug con el que enlazar su detalle (`/liga/${linkSlug}/partido/${id}`). */
export type CalendarFixture = WcFixture & {
  /** Nombre a mostrar: el de nuestra `Competition` si el fixture pertenece a
   * una, o el nombre real que da la API (p. ej. "Amistoso", "Community
   * Shield") si no. */
  competitionLabel: string;
  /** Slug para el link al detalle — SIEMPRE uno de `COMPETITIONS_BY_SLUG`
   * (la página de detalle hace notFound() si no), nunca el id/nombre crudo
   * de la liga real del fixture. `null` = fila sin enlace (ligas extra del
   * calendario sin hub propio, p. ej. Bundesliga o selecciones). */
  linkSlug: string | null;
};

/** Equipo favorito del usuario, para la sección "⭐ Tus favoritos". */
export type FavoriteTeamRef = {
  id: number;
  /** Slug válido para enlazar el detalle (derivado de link_path del favorito). */
  linkSlug: string;
};

/** Partidos de un mismo día calendario (huso Europe/Madrid), ya ordenados. */
export type CalendarDay = {
  /** Clave ISO yyyy-mm-dd en huso Europe/Madrid, para agrupar/ordenar. */
  dateKey: string;
  /** Etiqueta ya formateada: "Hoy", "Mañana", o "Vie 15 ago". */
  label: string;
  fixtures: CalendarFixture[];
};

function madridDateKey(date: Date): string {
  // en-CA formatea como yyyy-mm-dd de fábrica — más simple que armarlo a mano
  // a partir de formatToParts.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayLabel(dateKey: string, todayKey: string, tomorrowKey: string): string {
  if (dateKey === todayKey) return "Hoy";
  if (dateKey === tomorrowKey) return "Mañana";
  // Mediodía UTC del día en cuestión: cae siempre dentro del mismo día
  // calendario en Europe/Madrid (UTC+1/+2), evita saltos por huso horario.
  const date = new Date(`${dateKey}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID_TZ, weekday: "short" }).format(date);
  const day = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID_TZ, day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID_TZ, month: "short" }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day} ${month}`;
}

/**
 * Calendario de próximos partidos combinando competiciones + equipos
 * destacados. Pasa siempre por las funciones `get()`-wrapped/`unstable_cache`
 * de `api-football.ts` — cero `fetch` crudo nuevo. Sin `attachEvents()`:
 * son partidos por jugarse, no hay eventos que adjuntar.
 */
export async function getUpcomingCalendar(
  competitions: Competition[],
  featuredTeams: FeaturedTeam[],
  favoriteTeams: FavoriteTeamRef[] = [],
): Promise<CalendarDay[]> {
  // Un Map por fixture id: se llena primero con los de competición (más
  // fiables/nombre correcto) y luego, solo si falta, con los de equipos
  // destacados — así un mismo partido (p. ej. un amistoso entre dos
  // destacados, o el estreno liguero de uno de ellos) no aparece dos veces.
  const merged = new Map<number, CalendarFixture>();

  const perCompetition = await Promise.all(
    competitions.map(async (c): Promise<CalendarFixture[]> => {
      try {
        const fixtures = await getCompetitionUpcomingFixtures(c, 6);
        return fixtures
          // Rondas previas de las competiciones UEFA fuera del CALENDARIO
          // (pedido 18-ago, "lo más comercial posible"): los playoffs de
          // clasificación llenan la lista de cruces tipo Górnik-Mónaco o
          // Klaksvik-Riga que nadie busca aquí. Desde la fase liga entran
          // solas. El marcador en vivo y /liga/[slug] NO filtran — allí
          // sí se siguen esas rondas.
          .filter(
            (f) =>
              !UEFA_SLUGS.has(c.slug) ||
              !/qualif|playoff|prelim/i.test(f.league.round ?? ""),
          )
          .map((f) => ({
            ...f,
            ev: null,
            competitionLabel: c.name,
            linkSlug: c.slug,
          }));
      } catch {
        return [];
      }
    }),
  );
  for (const list of perCompetition) {
    for (const fx of list) merged.set(fx.fixture.id, fx);
  }

  // Ligas/copas extra del calendario (Bundesliga, copas ES/EN/IT/DE,
  // selecciones — ver CALENDAR_EXTRA_LEAGUES): sin hub propio → sin enlace.
  const perExtra = await Promise.all(
    CALENDAR_EXTRA_LEAGUES.map(async (entry): Promise<CalendarFixture[]> => {
      try {
        const fixtures = await getExtraLeagueUpcoming(entry, 6);
        return fixtures
          // `onlyTeamIds`: solo partidos donde juegue uno de esos equipos
          // (Bundesliga → los 4 grandes). `seniorOnly`: fuera juveniles y
          // femeninas (amistosos de selecciones → solo la absoluta).
          .filter((f) => {
            if (
              entry.onlyTeamIds &&
              !entry.onlyTeamIds.includes(f.teams.home.id) &&
              !entry.onlyTeamIds.includes(f.teams.away.id)
            ) {
              return false;
            }
            if (
              entry.seniorOnly &&
              (isYouthOrWomenTeam(f.teams.home.name) ||
                isYouthOrWomenTeam(f.teams.away.name))
            ) {
              return false;
            }
            return true;
          })
          .map((f) => ({
            ...f,
            ev: null,
            competitionLabel: entry.name,
            linkSlug: null,
          }));
      } catch {
        return [];
      }
    }),
  );
  for (const list of perExtra) {
    for (const fx of list) {
      if (!merged.has(fx.fixture.id)) merged.set(fx.fixture.id, fx);
    }
  }

  const perTeam = await Promise.all(
    featuredTeams.map(async (team): Promise<CalendarFixture[]> => {
      try {
        const { upcoming } = await getTeamFixtures(team.id, { next: 4 });
        return upcoming.map((f) => ({
          ...f,
          ev: null,
          competitionLabel:
            f.league.id === FRIENDLIES_LEAGUE_ID ? "Amistoso" : f.league.name,
          linkSlug: team.homeCompetitionSlug,
        }));
      } catch {
        return [];
      }
    }),
  );
  for (const list of perTeam) {
    for (const fx of list) {
      if (!merged.has(fx.fixture.id)) merged.set(fx.fixture.id, fx);
    }
  }

  const all = [...merged.values()]
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
    .slice(0, CALENDAR_MAX_FIXTURES);

  // Sección "⭐ Tus favoritos": los próximos partidos de los equipos que el
  // usuario marcó con la estrella, como PRIMER grupo del calendario. Van
  // también en su día normal a propósito (como FotMob) — esto es un
  // acceso rápido, no un filtro excluyente. `next: 4` coincide con lo que
  // ya precalcula el cron para los equipos destacados; para favoritos no
  // destacados cae a la llamada en vivo con su caché de 30 min.
  const favFixtures = new Map<number, CalendarFixture>();
  if (favoriteTeams.length > 0) {
    const perFav = await Promise.all(
      favoriteTeams.map(async (fav): Promise<CalendarFixture[]> => {
        try {
          const { upcoming } = await getTeamFixtures(fav.id, { next: 4 });
          return upcoming.slice(0, 3).map((f) => ({
            ...f,
            ev: null,
            competitionLabel:
              f.league.id === FRIENDLIES_LEAGUE_ID ? "Amistoso" : f.league.name,
            linkSlug: fav.linkSlug,
          }));
        } catch {
          return [];
        }
      }),
    );
    for (const list of perFav) {
      for (const fx of list) {
        if (!favFixtures.has(fx.fixture.id)) favFixtures.set(fx.fixture.id, fx);
      }
    }
  }
  const favDay: CalendarDay | null =
    favFixtures.size > 0
      ? {
          dateKey: "favoritos",
          label: "⭐ Tus favoritos",
          fixtures: [...favFixtures.values()]
            .sort(
              (a, b) =>
                new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime(),
            )
            .slice(0, 10),
        }
      : null;

  if (all.length === 0 && !favDay) return [];

  const now = new Date();
  const todayKey = madridDateKey(now);
  const tomorrowKey = madridDateKey(new Date(now.getTime() + 24 * 3600_000));

  const byDay = new Map<string, CalendarFixture[]>();
  for (const fx of all) {
    const key = madridDateKey(new Date(fx.fixture.date));
    const arr = byDay.get(key);
    if (arr) arr.push(fx);
    else byDay.set(key, [fx]);
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, fixtures]) => ({
      dateKey,
      label: dayLabel(dateKey, todayKey, tomorrowKey),
      fixtures,
    }));

  return favDay ? [favDay, ...days] : days;
}
