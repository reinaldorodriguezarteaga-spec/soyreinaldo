import Image from "next/image";
import Link from "next/link";
import { getUpcomingCalendar, type CalendarFixture } from "@/lib/sports/widget-data";
import { COMPETITIONS, FEATURED_TEAMS } from "@/lib/sports/competitions";

const MADRID_TZ = "Europe/Madrid";
/** Nº máximo de días a mostrar de entrada — la sección es una lista
 * cronológica, no un calendario visual; capamos para que no se convierta en
 * un muro cuando hay varias competiciones activas a la vez. */
const MAX_DAYS = 7;

function formatKickoffTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function CalendarMatchCard({ fx }: { fx: CalendarFixture }) {
  return (
    <Link
      href={`/liga/${fx.linkSlug}/partido/${fx.fixture.id}`}
      className="match"
      style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
    >
      <div className="match__meta">
        <span className="badge badge--accent truncate" style={{ maxWidth: "65%" }}>
          {fx.competitionLabel}
        </span>
        <span className="match__when">{formatKickoffTime(fx.fixture.date)}</span>
      </div>
      <div className="team">
        <span className="flag">
          <Image src={fx.teams.home.logo} alt="" width={20} height={20} unoptimized />
        </span>
        <span className="tn">{fx.teams.home.name}</span>
      </div>
      <div className="score">
        <span className="vs">VS</span>
      </div>
      <div className="team right">
        <span className="tn">{fx.teams.away.name}</span>
        <span className="flag">
          <Image src={fx.teams.away.logo} alt="" width={20} height={20} unoptimized />
        </span>
      </div>
    </Link>
  );
}

/**
 * Calendario de próximos partidos de la portada: combina las 9 competiciones
 * + los amistosos de los equipos destacados en una sola lista cronológica
 * agrupada por día ("Hoy", "Mañana", "Vie 15 ago"…). Complementa a
 * `HomeMatchWidget` (desplegable por competición, en vivo/hoy/resultados) —
 * ese no sirve para ver "qué se juega pronto" cuando casi todo está parado
 * (pretemporada). Server Component puro: son partidos por jugarse, no hace
 * falta refresco en vivo.
 */
export default async function UpcomingCalendar() {
  let days;
  try {
    days = await getUpcomingCalendar(COMPETITIONS, FEATURED_TEAMS);
  } catch {
    return null;
  }
  if (days.length === 0) return null;

  const visible = days.slice(0, MAX_DAYS);

  return (
    <section
      className="section"
      style={{ paddingTop: 10, paddingBottom: 10 }}
      aria-label="Calendario de próximos partidos"
    >
      <div className="wrap">
        <div className="shead" style={{ marginBottom: 18 }}>
          <div>
            <p className="eyebrow">Lo que viene</p>
            <h2 className="feat__title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
              Calendario.
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          {visible.map((day) => (
            <div key={day.dateKey}>
              <p
                className="mono"
                style={{
                  color: "var(--text-dim)",
                  fontSize: "0.64rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  margin: "0 0 10px",
                }}
              >
                {day.label}
              </p>
              <div className="grid2">
                {day.fixtures.map((fx) => (
                  <CalendarMatchCard key={fx.fixture.id} fx={fx} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
