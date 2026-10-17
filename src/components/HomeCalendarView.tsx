"use client";

import { useState } from "react";
import type { CalendarDay } from "@/lib/sports/widget-data";
import CompactMatchRow from "@/components/CompactMatchRow";
import { esDeFavoritos, useSoloFavoritos, type Seguidos } from "@/lib/solo-favoritos";

/** Nº máximo de días a mostrar de entrada — la sección es una lista
 * cronológica, no un calendario visual; capamos para que no se convierta en
 * un muro cuando hay varias competiciones activas a la vez. */
const MAX_DAYS = 7;

/** En pantallas táctiles la lista va sin scroll propio (ver `.hmcal-scroll`
 * en globals.css) y de entrada solo enseña estos días; el resto, tras
 * "Ver más días". */
const DIAS_MOVIL = 2;

/**
 * Contenido de la pestaña "Calendario" (envuelto por `HomeScoreboardTabs`).
 * Combina las próximas fixturas de las 9 competiciones + los amistosos de
 * los equipos destacados en una lista cronológica agrupada por día ("Hoy",
 * "Mañana", "Vie 15 ago"…). Solo "Hoy" y los favoritos van abiertos de
 * entrada; el resto de días, plegados. Presentacional puro — sin fetch propio,
 * `HomeScoreboard` ya trae los datos.
 */
export default function HomeCalendarView({
  days,
  liveContent,
  vivoPrimero = false,
  seguidos,
}: {
  days: CalendarDay[];
  /** Equipos ⭐: con "Solo favoritos" activo, solo sus partidos. */
  seguidos?: Seguidos;
  /** Bloque "En vivo" (HomeMatchWidgetClient liveOnly) — se pinta entre el
   * grupo de favoritos y los días de próximos partidos, como pidió el
   * dueño ("los en vivo junto con el calendario, arriba de los próximos"). */
  liveContent?: React.ReactNode;
  /** Algún favorito está jugando: el directo va antes que "⭐ Tus favoritos". */
  vivoPrimero?: boolean;
}) {
  // El grupo "⭐ Tus favoritos" (si existe, siempre el primero) no consume
  // un hueco de los MAX_DAYS de días reales.
  const [soloFav, setSoloFav] = useSoloFavoritos();
  const tieneSeguidos = !!seguidos && seguidos.equipos.length > 0;
  if (soloFav && tieneSeguidos) {
    days = days
      .map((d) => ({
        ...d,
        fixtures: d.fixtures.filter((fx) =>
          esDeFavoritos(seguidos!, fx.teams.home.id, fx.teams.away.id),
        ),
      }))
      .filter((d) => d.fixtures.length > 0);
  }
  const hasFavGroup = days[0]?.dateKey === "favoritos";
  const favDay = hasFavGroup ? [days[0]] : [];
  const restDays = (hasFavGroup ? days.slice(1) : days).slice(0, MAX_DAYS);

  // De entrada solo van abiertos "Hoy" y el grupo de favoritos (16-oct,
  // pedido del dueño: los demás días cargaban la portada de partidos que
  // quizá no interesan). "Expandir/Contraer todo" fuerza todos; cambiar el
  // modo remonta las tarjetas vía `key`, así se pueden seguir abriendo o
  // cerrando días sueltos después.
  const [modo, setModo] = useState<"auto" | "todo" | "nada">("auto");
  const abierto = (day: CalendarDay) =>
    modo === "todo" || (modo === "auto" && (day.label === "Hoy" || day.dateKey === "favoritos"));
  const [verMas, setVerMas] = useState(false);
  const primeros = restDays.slice(0, DIAS_MOVIL);
  const resto = restDays.slice(DIAS_MOVIL);

  return (
    <div className="space-y-3">
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {tieneSeguidos && (
          <label className="solofav">
            <input
              type="checkbox"
              checked={soloFav}
              onChange={(e) => setSoloFav(e.target.checked)}
            />
            <span>Solo favoritos ⭐</span>
          </label>
        )}
        <button
          type="button"
          className="backbtn"
          onClick={() => setModo((m) => (m === "todo" ? "nada" : "todo"))}
        >
          {modo === "todo" ? "Contraer todo ▴" : "Expandir todo ▾"}
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
       * cualquiera.
       *
       * En el iPhone eso no pasa (15-oct, app): un gesto que empieza dentro
       * de una caja con scroll se queda rebotando en ella. Por eso en
       * táctil la caja no tiene scroll y los días a partir del tercero
       * esperan detrás de "Ver más días" (CSS `.hmcal-resto--oculto`). */}
      <div className="hmcal-scroll space-y-3">
        {soloFav && tieneSeguidos && days.length === 0 && (
          <p className="panel" style={{ padding: "14px 16px", color: "var(--text-dim)", fontSize: "0.88rem" }}>
            En los próximos días no juega ninguno de tus favoritos.
          </p>
        )}
        {vivoPrimero && liveContent}
        {favDay.map((day) => (
          <DayCard key={`${day.dateKey}-${modo}`} day={day} open={abierto(day)} />
        ))}
        {!vivoPrimero && liveContent}
        {primeros.map((day) => (
          <DayCard key={`${day.dateKey}-${modo}`} day={day} open={abierto(day)} />
        ))}
        {resto.length > 0 && (
          <div className={`space-y-3 ${verMas ? "" : "hmcal-resto--oculto"}`}>
            {resto.map((day) => (
              <DayCard key={`${day.dateKey}-${modo}`} day={day} open={abierto(day)} />
            ))}
          </div>
        )}
        {resto.length > 0 && !verMas && (
          <button type="button" className="backbtn hmcal-mas" onClick={() => setVerMas(true)}>
            Ver más días ({resto.length}) ▾
          </button>
        )}
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
              dateLabel={fx.dayLabel}
            />
          ))}
        </div>
      </div>
    </details>
  );
}
