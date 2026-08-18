"use client";

import { useState } from "react";
import type { CalendarDay, HomeWidgetData } from "@/lib/sports/widget-data";
import HomeMatchWidgetClient from "@/components/HomeMatchWidgetClient";
import HomeCalendarView from "@/components/HomeCalendarView";

type Tab = "live" | "calendar";

/**
 * Cabecera + selector de pestañas compartido entre el marcador en vivo y el
 * calendario de la portada (antes dos secciones apiladas — el dueño pidió
 * que el calendario fuera una pestaña en vez de otro bloque más para
 * scrollear). Ambos datasets ya vienen resueltos por `HomeScoreboard`
 * (Server Component) vía `unstable_cache`, así que cambiar de pestaña no
 * dispara ningún fetch nuevo — solo cambia qué contenido ya renderizado se
 * muestra. Si solo una de las dos tiene algo que enseñar, se salta el
 * selector y se muestra esa directamente.
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
  const anyLive = hasLive && widgetData!.groups.some((g) => g.live.length > 0);
  const liveLabel = anyLive ? "Marcador en vivo" : "Fútbol de hoy";

  const [tab, setTab] = useState<Tab>(hasLive ? "live" : "calendar");

  if (!hasLive && !hasCalendar) return null;

  // Sin <section>/<div class="wrap"> propios: desde el layout de 3 columnas
  // de la portada, el contenedor lo pone page.tsx (columna central).
  return (
    <div aria-label="Marcador y calendario">
        {hasLive && hasCalendar ? (
          <div className="tabs" style={{ marginBottom: 22, maxWidth: 440 }}>
            <button type="button" className={tab === "live" ? "on" : ""} onClick={() => setTab("live")}>
              {anyLive && <span className="livepulse" style={{ marginRight: 7 }} />}
              {liveLabel}
            </button>
            <button
              type="button"
              className={tab === "calendar" ? "on" : ""}
              onClick={() => setTab("calendar")}
            >
              Calendario
            </button>
          </div>
        ) : (
          <div className="shead" style={{ marginBottom: 18 }}>
            <div>
              <p className="eyebrow">
                {hasLive && anyLive && <span className="livepulse" style={{ marginRight: 8 }} />}
                {hasLive ? liveLabel : "Lo que viene"}
              </p>
              <h2 className="feat__title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                {hasLive ? `${liveLabel}.` : "Calendario."}
              </h2>
            </div>
          </div>
        )}

        {tab === "live" && hasLive && <HomeMatchWidgetClient initial={widgetData!} />}
        {tab === "calendar" && hasCalendar && (
          <HomeCalendarView
            days={calendarDays!}
            // Con partidos en juego, el calendario también los enseña —
            // tarjeta "En vivo" (con su polling) entre favoritos y próximos.
            liveContent={
              hasLive && anyLive ? (
                <HomeMatchWidgetClient initial={widgetData!} liveOnly />
              ) : undefined
            }
          />
        )}
    </div>
  );
}
