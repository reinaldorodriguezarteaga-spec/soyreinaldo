"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isFinal, isLive } from "@/lib/sports/api-football";
import type { HomeFixture, HomeWidgetData } from "@/lib/sports/widget-data";
import MatchCardEvents from "@/components/MatchCardEvents";

const MADRID_TZ = "Europe/Madrid";
const POLL_MS = 20_000;

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

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mono"
      style={{
        color: "var(--text-dim)",
        fontSize: "0.68rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        margin: "0 0 14px",
      }}
    >
      {children}
    </p>
  );
}

/**
 * Tarjeta de partido de la portada — igual de forma que `LiveMatchCard`
 * (`tab-views.tsx`) / `WidgetMatchCard` (`MatchWidgetClient.tsx`), pero con
 * la competición en el slot de `.match__grp` (aquí hay LaLiga y Champions
 * mezclados, así que el nombre de la competición sustituye a la ronda) y los
 * enlaces apuntando a `/liga/${competition.slug}/...`.
 */
function HomeMatchCard({ fx }: { fx: HomeFixture }) {
  const base = `/liga/${fx.competition.slug}`;
  const live = isLive(fx);
  const final = isFinal(fx);
  const played = live || final;

  const meta = (
    <div className="match__meta">
      <span className="match__grp">{fx.competition.name}</span>
      {live ? (
        <span className="badge badge--danger">
          <span className="livepulse" />
          {fx.fixture.status.short === "HT"
            ? "DESCANSO"
            : fx.fixture.status.elapsed != null
              ? `${fx.fixture.status.elapsed}'`
              : "EN VIVO"}
        </span>
      ) : final ? (
        <span className="badge">Final</span>
      ) : (
        <span className="match__when">{formatKickoff(fx.fixture.date)}</span>
      )}
    </div>
  );

  if (played) {
    return (
      <Link
        href={`${base}/partido/${fx.fixture.id}`}
        className="match"
        style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
      >
        {meta}
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
          <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
            {fx.goals.home ?? 0}
          </b>
          <span className="vs">–</span>
          <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
            {fx.goals.away ?? 0}
          </b>
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
        <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
          <span />
          <span className="match__when" style={{ color: "var(--accent)" }}>
            Ver estadísticas →
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`${base}/partido/${fx.fixture.id}`}
      className="match"
      style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
    >
      {meta}
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
      <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
        <span />
        <span className="match__when" style={{ color: "var(--accent)" }}>
          ⏱ Cuenta atrás →
        </span>
      </div>
    </Link>
  );
}

/**
 * Franja de marcadores de la portada: en vivo → hoy (no en vivo) → resultados
 * recientes, cruzando LaLiga y Champions League. Se actualiza sola cada 20s
 * mientras haya algo en juego o a punto de empezar (`needsPolling`), contra
 * `/api/sports/home-widget` (paralelo a `/api/sports/widget`, exclusivo del
 * Mundial — no se toca).
 */
export default function HomeMatchWidgetClient({ initial }: { initial: HomeWidgetData }) {
  const [data, setData] = useState<HomeWidgetData>(initial);

  useEffect(() => {
    if (!data.needsPolling) return;

    let cancelled = false;

    async function tick() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/sports/home-widget", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: HomeWidgetData = await res.json();
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

  const live = data.live;
  const todayNonLive = data.today.filter((f) => !isLive(f));
  const recent = data.recentResults;

  if (live.length === 0 && todayNonLive.length === 0 && recent.length === 0) return null;

  const anyLive = live.length > 0;
  const heading = anyLive
    ? "Marcador en vivo"
    : todayNonLive.length > 0
      ? "Fútbol hoy"
      : "Resultados recientes";

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
              LaLiga · Champions League
            </p>
            <h2 className="feat__title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
              {heading}.
            </h2>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/liga/laliga" className="btn btn--ghost">
              LaLiga <span className="arr">→</span>
            </Link>
            <Link href="/liga/champions" className="btn btn--ghost">
              Champions <span className="arr">→</span>
            </Link>
          </div>
        </div>

        {live.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <GroupLabel>En juego</GroupLabel>
            <div className="grid2">
              {live.map((fx) => (
                <HomeMatchCard key={fx.fixture.id} fx={fx} />
              ))}
            </div>
          </div>
        )}

        {todayNonLive.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <GroupLabel>{anyLive ? "Más partidos hoy" : "Partidos de hoy"}</GroupLabel>
            <div className="grid2">
              {todayNonLive.map((fx) => (
                <HomeMatchCard key={fx.fixture.id} fx={fx} />
              ))}
            </div>
          </div>
        )}

        {recent.length > 0 && (
          <div>
            <GroupLabel>Resultados recientes</GroupLabel>
            <div className="grid2">
              {recent.map((fx) => (
                <HomeMatchCard key={fx.fixture.id} fx={fx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
