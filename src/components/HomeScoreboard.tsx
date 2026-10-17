import {
  getHomeWidgetData,
  getUpcomingCalendar,
  type FavoriteTeamRef,
} from "@/lib/sports/widget-data";
import { COMPETITIONS, COMPETITIONS_BY_SLUG, FEATURED_TEAMS } from "@/lib/sports/competitions";
import { createClient } from "@/lib/supabase/server";
import type { Fixture } from "@/lib/sports/api-football";
import HomeScoreboardTabs from "@/components/HomeScoreboardTabs";

/** Equipos favoritos (⭐) del usuario logueado, para la sección "Tus
 * favoritos" del calendario. `ref_id` guarda el id de equipo de
 * API-Football y `link_path` un enlace ya resuelto tipo
 * /liga/laliga/equipo/529 — de ahí sale el slug para enlazar el detalle. */
async function getFavoriteTeams(): Promise<FavoriteTeamRef[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("user_favorites")
      .select("ref_id, link_path")
      .eq("user_id", user.id)
      .eq("kind", "team")
      .order("created_at", { ascending: true })
      .limit(8);
    return (data ?? [])
      .map((row) => {
        const id = Number(row.ref_id);
        const slug = (row.link_path ?? "").split("/")[2] ?? "";
        return {
          id,
          linkSlug: COMPETITIONS_BY_SLUG[slug] ? slug : "laliga",
        };
      })
      .filter((f) => Number.isFinite(f.id) && f.id > 0);
  } catch {
    return [];
  }
}

/**
 * Trae en paralelo los dos datasets de la portada — marcador en vivo/hoy
 * (`getHomeWidgetData`) y calendario de próximos partidos (`getUpcomingCalendar`,
 * útil sobre todo en pretemporada cuando casi todo está parado) — y se los
 * pasa ya resueltos a `HomeScoreboardTabs`, que decide cómo mostrarlos
 * (pestañas si hay algo en ambos, directo si solo hay uno). Ambas funciones
 * pasan por `unstable_cache`, así que fallar una no debe tumbar la otra.
 */
/** Ligas favoritas (⭐, `ref_id` = slug) para el filtro "Solo favoritos". */
async function getFavoriteLeagues(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("user_favorites")
      .select("ref_id")
      .eq("user_id", user.id)
      .eq("kind", "competition");
    return (data ?? []).map((r) => r.ref_id).filter((s) => !!COMPETITIONS_BY_SLUG[s]);
  } catch {
    return [];
  }
}

/**
 * Solo los campos de un partido que pinta la portada (17-oct): cada partido
 * de la API trae sede, árbitro, periodos, marcas de tiempo, bandera, país...
 * y la portada manda ~45 al navegador: eran ~50 KB de los 224 KB del HTML.
 */
function ligero<T extends Fixture>(f: T): T {
  return {
    ...f,
    fixture: { id: f.fixture.id, date: f.fixture.date, status: f.fixture.status },
    league: { id: f.league.id, name: f.league.name, logo: f.league.logo, round: f.league.round },
    teams: {
      home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo, winner: f.teams.home.winner },
      away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo, winner: f.teams.away.winner },
    },
    score: undefined,
  } as unknown as T;
}

export default async function HomeScoreboard() {
  // El directo no depende de los favoritos: va en paralelo con ellos.
  const widgetPromise = getHomeWidgetData(COMPETITIONS).catch(() => null);
  const [favorites, ligasFav] = await Promise.all([getFavoriteTeams(), getFavoriteLeagues()]);
  const [widgetRaw, calendarRaw] = await Promise.all([
    widgetPromise,
    getUpcomingCalendar(COMPETITIONS, FEATURED_TEAMS, favorites).catch(() => null),
  ]);
  const widgetData = widgetRaw && {
    ...widgetRaw,
    groups: widgetRaw.groups.map((g) => ({
      ...g,
      live: g.live.map(ligero),
      finishedToday: g.finishedToday.map(ligero),
    })),
  };
  const calendarDays = calendarRaw && calendarRaw.map((d) => ({ ...d, fixtures: d.fixtures.map(ligero) }));

  return (
    <HomeScoreboardTabs
      widgetData={widgetData}
      calendarDays={calendarDays}
      favoriteTeamIds={favorites.map((f) => f.id)}
      seguidos={{ equipos: favorites.map((f) => f.id), ligas: ligasFav }}
    />
  );
}
