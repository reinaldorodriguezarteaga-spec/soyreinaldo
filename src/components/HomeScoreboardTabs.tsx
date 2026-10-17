import type { CalendarDay, HomeWidgetData } from "@/lib/sports/widget-data";
import HomeMatchWidgetClient from "@/components/HomeMatchWidgetClient";
import HomeCalendarView from "@/components/HomeCalendarView";
import { esDeFavoritos, type Seguidos } from "@/lib/favoritos-puros";

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
  favoriteTeamIds,
  seguidos,
}: {
  widgetData: HomeWidgetData | null;
  calendarDays: CalendarDay[] | null;
  favoriteTeamIds: number[];
  /** Equipos y ligas ⭐, para el interruptor "Solo favoritos". */
  seguidos: Seguidos;
}) {
  const hasLive = !!widgetData && widgetData.groups.length > 0;
  // ¿Juega ahora algún favorito (equipo o liga)? Entonces el directo va lo
  // primero de todo (17-oct, pedido del dueño: verlos sin tener que bajar).
  const favEnVivo =
    !!widgetData &&
    widgetData.groups.some((g) =>
      g.live.some((fx) => esDeFavoritos(seguidos, fx.teams.home.id, fx.teams.away.id, g.competition.slug)),
    );
  const hasCalendar = !!calendarDays && calendarDays.length > 0;

  if (!hasLive && !hasCalendar) return null;

  const liveCard = hasLive ? (
    <HomeMatchWidgetClient
      initial={widgetData!}
      liveOnly
      favoriteTeamIds={favoriteTeamIds}
      seguidos={seguidos}
    />
  ) : undefined;

  if (!hasCalendar) {
    return <div aria-label="Marcador en vivo">{liveCard}</div>;
  }

  return (
    <div aria-label="Marcador y calendario">
      <HomeCalendarView
        days={calendarDays!}
        liveContent={liveCard}
        vivoPrimero={favEnVivo}
        seguidos={seguidos}
      />
    </div>
  );
}
