import {
  getHomeWidgetData,
  getUpcomingCalendar,
  type FavoriteTeamRef,
} from "@/lib/sports/widget-data";
import { COMPETITIONS, COMPETITIONS_BY_SLUG, FEATURED_TEAMS } from "@/lib/sports/competitions";
import { createClient } from "@/lib/supabase/server";
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
export default async function HomeScoreboard() {
  const favorites = await getFavoriteTeams();
  const [widgetData, calendarDays] = await Promise.all([
    getHomeWidgetData(COMPETITIONS).catch(() => null),
    getUpcomingCalendar(COMPETITIONS, FEATURED_TEAMS, favorites).catch(() => null),
  ]);

  return <HomeScoreboardTabs widgetData={widgetData} calendarDays={calendarDays} />;
}
