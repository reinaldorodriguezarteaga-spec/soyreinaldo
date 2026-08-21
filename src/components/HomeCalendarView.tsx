"use client";

import { useState } from "react";
import type { CalendarDay } from "@/lib/sports/widget-data";
import CompactMatchRow from "@/components/CompactMatchRow";

/** Nº máximo de días a mostrar de entrada — la sección es una lista
 * cronológica, no un calendario visual; capamos para que no se convierta en
 * un muro cuando hay varias competiciones activas a la vez. */
const MAX_DAYS = 7;

/**
 * Contenido de la pestaña "Calendario" (envuelto por `HomeScoreboardTabs`).
 * Combina las próximas fixturas de las 9 competiciones + los amistosos de
 * los equipos destacados en una lista cronológica agrupada por día ("Hoy",
 * "Mañana", "Vie 15 ago"…). Cada día se muestra siempre expandido — al
 * vivir en su propia pestaña (el usuario ya la abrió a propósito) no hace
 * falta colapsarlo como al widget en vivo, que comparte pantalla con hasta
 * 9 competiciones a la vez. Presentacional puro — sin fetch propio,
 * `HomeScoreboard` ya trae los datos.
 */
export default function HomeCalendarView({
  days,
  liveContent,
}: {
  days: CalendarDay[];
  /** Bloque "En vivo" (HomeMatchWidgetClient liveOnly) — se pinta entre el
   * grupo de favoritos y los días de próximos partidos, como pidió el
   * dueño ("los en vivo junto con el calendario, arriba de los próximos"). */
  liveContent?: React.ReactNode;
}) {
  // El grupo "⭐ Tus favoritos" (si existe, siempre el primero) no consume
  // un hueco de los MAX_DAYS de días reales.
  const hasFavGroup = days[0]?.dateKey === "favoritos";
  const favDay = hasFavGroup ? [days[0]] : [];
  const restDays = (hasFavGroup ? days.slice(1) : days).slice(0, MAX_DAYS);

  // "Contraer todo" (pedido 18-ago: el calendario desplegado entero es
  // mucha info). Cambiar allOpen remonta las tarjetas vía `key`, así el
  // usuario puede seguir abriendo/cerrando días sueltos después.
  const [allOpen, setAllOpen] = useState(true);

  return (
    <div className="space-y-3">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="backbtn"
          onClick={() => setAllOpen((v) => !v)}
        >
          {allOpen ? "Contraer todo ▴" : "Expandir todo ▾"}
        </button>
      </div>

      {/* El calendario tiene su propio scroll.
       *
       * Desplegado entero mide varias pantallas, y eso convertía la portada en
       * un túnel: para llegar a la quiniela, al análisis o a cualquier otra
       * cosa había que recorrerlo entero. Encerrándolo en su caja, quien
       * quiera calendario lo recorre aquí dentro, y quien no, sigue bajando
       * por la página como si no existiera.
       *
       * Sin `overscroll-behavior: contain` a propósito: al llegar al final de
       * la lista el gesto continúa moviendo la página, que es lo que espera
       * cualquiera. */}
      <div className="hmcal-scroll space-y-3">
        {favDay.map((day) => (
          <DayCard key={`${day.dateKey}-${allOpen}`} day={day} open={allOpen} />
        ))}
        {liveContent}
        {restDays.map((day) => (
          <DayCard key={`${day.dateKey}-${allOpen}`} day={day} open={allOpen} />
        ))}
      </div>
    </div>
  );
}

function DayCard({ day, open = true }: { day: CalendarDay; open?: boolean }) {
  return (
    <details className="panel disclosure" style={{ overflow: "hidden" }} open={open}>
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
        }}
      >
        <b
          className="mono"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.64rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {day.label}
        </b>
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.66rem" }}>
          {day.fixtures.length} partido{day.fixtures.length === 1 ? "" : "s"}
        </span>
        <span className="chev" style={{ color: "var(--text-dim)" }}>
          ▾
        </span>
      </summary>
      <div style={{ borderTop: "1px solid var(--line)", padding: "4px 12px 12px" }}>
        <div className="hmrowlist">
          {day.fixtures.map((fx) => (
            <CompactMatchRow
              key={fx.fixture.id}
              fx={fx}
              href={fx.linkSlug ? `/liga/${fx.linkSlug}/partido/${fx.fixture.id}` : null}
              badge={fx.competitionLabel}
            />
          ))}
        </div>
      </div>
    </details>
  );
}
