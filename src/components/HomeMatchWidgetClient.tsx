"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isFinal, isLive } from "@/lib/sports/api-football";
import type {
  CompetitionGroup,
  HomeFixture,
  HomeWidgetData,
} from "@/lib/sports/widget-data";
import MatchCardEvents from "@/components/MatchCardEvents";

const MADRID_TZ = "Europe/Madrid";
// >45s (el TTL de getCompetitionFixturesWindow) para que la mayoría de polls
// acierten en caché en vez de pegar en vivo a la API — este widget cruza
// las 9 competiciones en cada poll, así que el margen importa el triple.
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

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </p>
  );
}

/**
 * Tarjeta de partido — misma forma que `LiveMatchCard` (`tab-views.tsx`),
 * pero sin el slot de ronda (aquí ya está claro de qué competición es, por
 * el desplegable que la contiene) y con los enlaces a `/liga/${slug}/...`.
 */
function HomeMatchCard({ fx, slug }: { fx: HomeFixture; slug: string }) {
  const base = `/liga/${slug}`;
  const live = isLive(fx);
  const final = isFinal(fx);
  const played = live || final;

  const meta = (
    <div className="match__meta">
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
 * Desplegable de una competición: resumen (nombre + nº de partidos + pulso
 * si hay algo en vivo) y, dentro, en vivo → hoy → resultados recientes.
 * Abierto por defecto si tiene algo en juego; si no, solo la primera.
 */
function CompetitionAccordion({
  group,
  defaultOpen,
}: {
  group: CompetitionGroup;
  defaultOpen: boolean;
}) {
  const { competition, live, today, recentResults } = group;
  const todayNonLive = today.filter((f) => !isLive(f));
  const total = live.length + todayNonLive.length + recentResults.length;
  const anyLive = live.length > 0;

  return (
    <details className="panel" open={defaultOpen} style={{ overflow: "hidden" }}>
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
        {anyLive && <span className="livepulse" />}
        <b style={{ flex: 1, minWidth: 0 }} className="truncate">
          {competition.name}
        </b>
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.66rem" }}>
          {total} partido{total === 1 ? "" : "s"}
        </span>
        <Link
          href={`/liga/${competition.slug}`}
          className="match__when"
          style={{ color: "var(--accent)", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          Ver todo →
        </Link>
      </summary>
      <div style={{ borderTop: "1px solid var(--line)", padding: "16px" }}>
        {live.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <GroupLabel>En juego</GroupLabel>
            <div className="grid2">
              {live.map((fx) => (
                <HomeMatchCard key={fx.fixture.id} fx={fx} slug={competition.slug} />
              ))}
            </div>
          </div>
        )}
        {todayNonLive.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <GroupLabel>{anyLive ? "Más partidos hoy" : "Partidos de hoy"}</GroupLabel>
            <div className="grid2">
              {todayNonLive.map((fx) => (
                <HomeMatchCard key={fx.fixture.id} fx={fx} slug={competition.slug} />
              ))}
            </div>
          </div>
        )}
        {recentResults.length > 0 && (
          <div>
            <GroupLabel>Resultados recientes</GroupLabel>
            <div className="grid2">
              {recentResults.map((fx) => (
                <HomeMatchCard key={fx.fixture.id} fx={fx} slug={competition.slug} />
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

/**
 * Franja de marcadores de la portada: una competición por desplegable (no se
 * mezclan los partidos de distintas ligas, para evitar confusión con varias
 * competiciones activas a la vez). Se actualiza sola cada 20s mientras haya
 * algo en juego o a punto de empezar (`needsPolling`), contra
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

  const { groups } = data;
  if (groups.length === 0) return null;

  const anyLive = groups.some((g) => g.live.length > 0);
  const heading = anyLive ? "Marcador en vivo" : "Fútbol de hoy";
  // Abre por defecto las que tienen algo en juego; si ninguna, solo la primera.
  const firstOpenSlug = anyLive ? null : groups[0]?.competition.slug;

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
              {groups.length} competición{groups.length === 1 ? "" : "es"}
            </p>
            <h2 className="feat__title" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
              {heading}.
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {groups.map((g) => (
            <CompetitionAccordion
              key={g.competition.slug}
              group={g}
              defaultOpen={g.live.length > 0 || g.competition.slug === firstOpenSlug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
