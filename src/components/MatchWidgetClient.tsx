"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isFinal, isLive, type Fixture } from "@/lib/sports/api-football";
import type { WcFixture, WidgetData } from "@/lib/sports/widget-data";
import MatchCardEvents from "@/components/MatchCardEvents";

const MADRID_TZ = "Europe/Madrid";
const POLL_MS = 30_000;

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .toUpperCase();
}

/**
 * Convierte el string "round" de API-Football a una etiqueta corta:
 *   "Group Stage - 1"      → "J1 grupos"
 *   "Round of 16"          → "Octavos"
 *   "Quarter-finals"       → "Cuartos"
 *   "Semi-finals"          → "Semifinales"
 *   "3rd Place Final"      → "3er puesto"
 *   "Final"                → "Final"
 */
function formatRound(round: string | undefined | null): string | null {
  if (!round) return null;
  const m = round.match(/Regular Season\s*-\s*(\d+)/i);
  if (m) return `Jornada ${m[1]}`;
  const g = round.match(/Group Stage\s*-\s*(\d+)/i);
  if (g) return `J${g[1]} grupos`;
  if (/Round of 16/i.test(round)) return "Octavos";
  if (/Quarter/i.test(round)) return "Cuartos";
  if (/Semi/i.test(round)) return "Semifinales";
  if (/3rd Place/i.test(round)) return "3er puesto";
  if (/^Final$/i.test(round.trim())) return "Final";
  return round;
}

function LiveBadge({ fx }: { fx: Fixture }) {
  const label =
    fx.fixture.status.short === "HT"
      ? "DESCANSO"
      : fx.fixture.status.elapsed != null
        ? `${fx.fixture.status.elapsed}'`
        : "EN VIVO";
  return (
    <span className="badge badge--danger">
      <span className="livepulse" />
      {label}
    </span>
  );
}

function WidgetMatchCard({ fx }: { fx: WcFixture }) {
  const live = isLive(fx);
  const final = isFinal(fx);
  const showScore = live || final;
  const played = live || final;
  const roundLabel = formatRound(fx.league?.round);
  const inner = (
    <>
      <div className="match__meta">
        <span className="match__grp">{roundLabel ?? "Mundial 2026"}</span>
        {live ? (
          <LiveBadge fx={fx} />
        ) : final ? (
          <span className="badge">Final</span>
        ) : (
          <span className="match__when">{formatKickoff(fx.fixture.date)}</span>
        )}
      </div>
      <div className="team">
        <span className="flag">
          <Image src={fx.teams.home.logo} alt="" width={20} height={20} unoptimized />
        </span>
        <span
          className="tn"
          style={final && !fx.teams.home.winner ? { color: "var(--text-dim)" } : undefined}
        >
          {fx.teams.home.name}
        </span>
      </div>
      <div className="score">
        {showScore ? (
          <>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
              {fx.goals.home ?? 0}
            </b>
            <span className="vs">–</span>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
              {fx.goals.away ?? 0}
            </b>
          </>
        ) : (
          <span className="vs">VS</span>
        )}
      </div>
      <div className="team right">
        <span
          className="tn"
          style={final && !fx.teams.away.winner ? { color: "var(--text-dim)" } : undefined}
        >
          {fx.teams.away.name}
        </span>
        <span className="flag">
          <Image src={fx.teams.away.logo} alt="" width={20} height={20} unoptimized />
        </span>
      </div>
      <MatchCardEvents ev={fx.ev} homeId={fx.teams.home.id} awayId={fx.teams.away.id} />
      {played && (
        <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
          <span />
          <span className="match__when" style={{ color: "var(--accent)" }}>
            Ver estadísticas →
          </span>
        </div>
      )}
    </>
  );
  if (played) {
    return (
      <Link
        href={`/mundial/partido/${fx.fixture.id}`}
        className="match"
        style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
      >
        {inner}
      </Link>
    );
  }
  return <div className="match">{inner}</div>;
}

/**
 * Franja de marcadores para la portada: los partidos del Mundial de hoy
 * (o el partido relevante de Barça/Madrid fuera del torneo). Se actualiza
 * sola cada 30s mientras haya partido en juego o a punto de empezar, y
 * desaparece cuando no hay nada que mostrar.
 */
export default function MatchWidgetClient({ initial }: { initial: WidgetData }) {
  const [data, setData] = useState<WidgetData>(initial);

  useEffect(() => {
    if (!data.needsPolling) return;

    let cancelled = false;

    async function tick() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/sports/widget", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: WidgetData = await res.json();
        if (!cancelled) setData(next);
      } catch {
        // El polling es best-effort; un fallo puntual no debe romper la UI.
      }
    }

    const timer = setInterval(tick, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [data.needsPolling]);

  if (data.fixtures.length === 0) return null;

  const anyLive = data.fixtures.some(isLive);
  const heading = anyLive
    ? "Marcador en vivo"
    : data.mode === "wc"
      ? "El Mundial hoy"
      : "Marcador";

  return (
    <section
      className="section"
      style={{ paddingTop: 44, paddingBottom: 10 }}
      aria-label="Marcador en vivo"
    >
      <div className="wrap">
        <div className="shead" style={{ marginBottom: 18 }}>
          <div>
            <p className="eyebrow">
              {anyLive && <span className="livepulse" style={{ marginRight: 8 }} />}
              Mundial 2026
            </p>
            <h2 className="feat__title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
              {heading}.
            </h2>
          </div>
          <Link href="/mundial?v=envivo" className="btn btn--ghost">
            Ver el Mundial <span className="arr">→</span>
          </Link>
        </div>
        <div className="grid2">
          {data.fixtures.map((fx) => (
            <WidgetMatchCard key={fx.fixture.id} fx={fx} />
          ))}
        </div>
      </div>
    </section>
  );
}
