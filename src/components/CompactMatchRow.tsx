import Image from "next/image";
import Link from "next/link";
import { isFinal, isLive, type Fixture } from "@/lib/sports/api-football";

const MADRID_TZ = "Europe/Madrid";

function formatKickoffTime(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Fila de partido de una sola línea (estilo FotMob): hora/estado,
 * escudo+nombre de cada equipo y marcador, sin badges de eventos ni CTA —
 * eso se reserva para el detalle del partido. Compartida por
 * `HomeMatchWidgetClient` (dentro de cada desplegable de competición, sin
 * `badge`) y `HomeCalendarView` (mezcla competiciones por día, con `badge`
 * para distinguirlas).
 */
export default function CompactMatchRow({
  fx,
  href,
  badge,
  dateLabel,
}: {
  fx: Fixture;
  /** `null` = fila informativa sin enlace (ligas del calendario sin hub
   * propio, p. ej. Bundesliga o selecciones). */
  href: string | null;
  badge?: string;
  /** Día del partido ("Hoy", "Dom 23 ago"), junto al badge. Solo para filas
   * fuera de una agrupación por día (el grupo "⭐ Tus favoritos" mezcla
   * fechas y la hora sola no dice cuándo se juega). */
  dateLabel?: string;
}) {
  const live = isLive(fx);
  const final = isFinal(fx);

  let timeNode: React.ReactNode;
  if (live) {
    timeNode = (
      <span className="hmrow__time hmrow__time--live">
        <span className="livepulse" />
        {fx.fixture.status.short === "HT"
          ? "HT"
          : fx.fixture.status.elapsed != null
            ? `${fx.fixture.status.elapsed}'`
            : "•"}
      </span>
    );
  } else if (final) {
    timeNode = <span className="hmrow__time">Fin</span>;
  } else {
    timeNode = <span className="hmrow__time">{formatKickoffTime(fx.fixture.date)}</span>;
  }

  const inner = (
    <>
      {timeNode}
      <span className="hmrow__team hmrow__team--home">
        <Image
          className="hmrow__crest"
          src={fx.teams.home.logo}
          alt=""
          width={16}
          height={16}
          unoptimized
        />
        <span
          className="hmrow__name"
          style={final && !fx.teams.home.winner ? { color: "var(--text-dim)" } : undefined}
        >
          {fx.teams.home.name}
        </span>
      </span>
      <span className="hmrow__score">
        {live || final ? `${fx.goals.home ?? 0}–${fx.goals.away ?? 0}` : "VS"}
      </span>
      <span className="hmrow__team hmrow__team--away">
        <span
          className="hmrow__name"
          style={final && !fx.teams.away.winner ? { color: "var(--text-dim)" } : undefined}
        >
          {fx.teams.away.name}
        </span>
        <Image
          className="hmrow__crest"
          src={fx.teams.away.logo}
          alt=""
          width={16}
          height={16}
          unoptimized
        />
      </span>
    </>
  );

  const row = href ? (
    <Link href={href} className="hmrow">
      {inner}
    </Link>
  ) : (
    <span className="hmrow">{inner}</span>
  );

  if (!badge && !dateLabel) return row;
  return (
    <div className="hmrow__wrap">
      <span className="hmrow__badge truncate">
        {badge}
        {dateLabel && (
          <span style={{ color: "var(--text-dim)" }}>
            {badge ? " · " : ""}
            {dateLabel}
          </span>
        )}
      </span>
      {row}
    </div>
  );
}
