import type { CalendarDay, HomeWidgetData } from "@/lib/sports/widget-data";
import HomeMatchWidgetClient from "@/components/HomeMatchWidgetClient";
import HomeCalendarView from "@/components/HomeCalendarView";

/**
 * Feed único de la portada (pedido 18-ago: fuera pestañas — "los partidos
 * en vivo arriba de los próximos, eliminando esas pestañas"): ⭐ favoritos →
 * tarjeta En vivo/Hoy (con su polling) → días del calendario. Ambos
 * datasets vienen resueltos por `HomeScoreboard` (Server Component). Sin
 * <section>/<wrap> propios: el contenedor lo pone la columna central del
 * layout de 3 columnas de page.tsx.
 */
export default function HomeScoreboardTabs({
  widgetData,
  calendarDays,
}: {
  widgetData: HomeWidgetData | null;
  calendarDays: CalendarDay[] | null;
}) {
  const hasLive = !!widgetData && widgetData.groups.length > 0;
  const hasCalendar = !!calendarDays && calendarDays.length > 0;

  if (!hasLive && !hasCalendar) return null;

  const liveCard = hasLive ? (
    <HomeMatchWidgetClient initial={widgetData!} liveOnly />
  ) : undefined;

  if (!hasCalendar) {
    return <div aria-label="Marcador en vivo">{liveCard}</div>;
  }

  return (
    <div aria-label="Marcador y calendario">
      <HomeCalendarView days={calendarDays!} liveContent={liveCard} />
    </div>
  );
}
