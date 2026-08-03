import { getHomeWidgetData, getUpcomingCalendar } from "@/lib/sports/widget-data";
import { COMPETITIONS, FEATURED_TEAMS } from "@/lib/sports/competitions";
import HomeScoreboardTabs from "@/components/HomeScoreboardTabs";

/**
 * Trae en paralelo los dos datasets de la portada — marcador en vivo/hoy
 * (`getHomeWidgetData`) y calendario de próximos partidos (`getUpcomingCalendar`,
 * útil sobre todo en pretemporada cuando casi todo está parado) — y se los
 * pasa ya resueltos a `HomeScoreboardTabs`, que decide cómo mostrarlos
 * (pestañas si hay algo en ambos, directo si solo hay uno). Ambas funciones
 * pasan por `unstable_cache`, así que fallar una no debe tumbar la otra.
 */
export default async function HomeScoreboard() {
  const [widgetData, calendarDays] = await Promise.all([
    getHomeWidgetData(COMPETITIONS).catch(() => null),
    getUpcomingCalendar(COMPETITIONS, FEATURED_TEAMS).catch(() => null),
  ]);

  return <HomeScoreboardTabs widgetData={widgetData} calendarDays={calendarDays} />;
}
