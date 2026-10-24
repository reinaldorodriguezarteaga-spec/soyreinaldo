import type { CalendarDay, HomeWidgetData } from "@/lib/sports/widget-data";
import HomeMatchWidgetClient from "@/components/HomeMatchWidgetClient";
import HomeCalendarView from "@/components/HomeCalendarView";
import HomeFechas from "@/components/HomeFechas";
import type { Seguidos } from "@/lib/favoritos-puros";

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
  hoy,
}: {
  /** yyyy-mm-dd de hoy en Madrid, para la tira de fechas. */
  hoy: string;
  widgetData: HomeWidgetData | null;
  calendarDays: CalendarDay[] | null;
  favoriteTeamIds: number[];
  /** Equipos y ligas ⭐, para el interruptor "Solo favoritos". */
  seguidos: Seguidos;
}) {
  const hasLive = !!widgetData && widgetData.groups.length > 0;
  // ¿Juega ahora alguno de SUS EQUIPOS? Entonces el directo va lo primero
  // (17-oct, pedido del dueño). Solo equipos, no ligas: con una liga
  // entera seguida se llenaba la sección de partidos que no buscaba.
  const equiposFav = new Set(favoriteTeamIds);
  const favEnVivo =
    !!widgetData &&
    widgetData.groups.some((g) =>
      g.live.some((fx) => equiposFav.has(fx.teams.home.id) || equiposFav.has(fx.teams.away.id)),
    );
  const hasCalendar = !!calendarDays && calendarDays.length > 0;

  // Con clave propia: HomeCalendarView la coloca entre sus listas de días y,
  // al venir ya creada desde aquí (componente de servidor), React avisaba de
  // «Each child in a list should have a unique key» en la portada.
  const liveCard = hasLive ? (
    <HomeMatchWidgetClient
      key="directo"
      initial={widgetData!}
      liveOnly
      favoriteTeamIds={favoriteTeamIds}
      seguidos={seguidos}
    />
  ) : undefined;

  // Tira de fechas encima (24-oct): en «Hoy», este feed; en otro día, sus
  // partidos. Va siempre, aunque hoy no haya nada: así se llega a ayer.
  return (
    <div aria-label="Marcador y calendario">
      <HomeFechas hoy={hoy} seguidos={seguidos}>
        {hasCalendar ? (
          <HomeCalendarView days={calendarDays!} liveContent={liveCard} vivoPrimero={favEnVivo} seguidos={seguidos} />
        ) : hasLive ? (
          <div aria-label="Marcador en vivo">{liveCard}</div>
        ) : (
          <p className="panel hfechas__aviso">Hoy no hay partidos de nuestras competiciones.</p>
        )}
      </HomeFechas>
    </div>
  );
}
