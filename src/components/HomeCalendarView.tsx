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
 * "Mañana", "Vie 15 ago"…), cada día en un desplegable cerrado por defecto
 * (mismo criterio que el widget en vivo: con varias competiciones activas un
 * solo día puede traer muchos partidos). Presentacional puro — sin fetch
 * propio, `HomeScoreboard` ya trae los datos.
 */
export default function HomeCalendarView({ days }: { days: CalendarDay[] }) {
  const visible = days.slice(0, MAX_DAYS);

  return (
    <div className="space-y-3">
      {visible.map((day) => (
        <details key={day.dateKey} className="panel" style={{ overflow: "hidden" }}>
          <summary
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              cursor: "pointer",
              listStyle: "none",
              userSelect: "none",
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
          </summary>
          <div style={{ borderTop: "1px solid var(--line)", padding: "4px 12px 12px" }}>
            <div className="hmrowlist">
              {day.fixtures.map((fx) => (
                <CompactMatchRow
                  key={fx.fixture.id}
                  fx={fx}
                  href={`/liga/${fx.linkSlug}/partido/${fx.fixture.id}`}
                  badge={fx.competitionLabel}
                />
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
