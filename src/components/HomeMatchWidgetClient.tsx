"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLive } from "@/lib/sports/api-football";
import type { CompetitionGroup, HomeWidgetData } from "@/lib/sports/widget-data";
import CompactMatchRow from "@/components/CompactMatchRow";

// >45s (el TTL de getCompetitionFixturesWindow) para que la mayoría de polls
// acierten en caché en vez de pegar en vivo a la API — este widget cruza
// las 9 competiciones en cada poll, así que el margen importa el triple.
const POLL_MS = 30_000;

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mono"
      style={{
        color: "var(--text-dim)",
        fontSize: "0.62rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        margin: "10px 4px 2px",
      }}
    >
      {children}
    </p>
  );
}

/**
 * Desplegable de una competición: resumen (nombre + nº de partidos + pulso
 * si hay algo en vivo) y, dentro, en vivo → hoy → resultados recientes como
 * filas compactas de una línea (`CompactMatchRow`). Cerrado por defecto (con
 * 9 competiciones activas a la vez, abrir todas las que tienen algo en juego
 * saturaba la portada) — el pulso en el resumen ya avisa de qué competición
 * tiene algo en vivo sin necesidad de desplegarla. Sin prop `open` controlada
 * por React: así el toggle manual del usuario no se pisa en cada poll de 30s.
 */
function CompetitionAccordion({ group }: { group: CompetitionGroup }) {
  const { competition, live, today, recentResults } = group;
  const todayNonLive = today.filter((f) => !isLive(f));
  const total = live.length + todayNonLive.length + recentResults.length;
  const anyLive = live.length > 0;
  const base = `/liga/${competition.slug}`;

  return (
    <details className="panel" style={{ overflow: "hidden" }}>
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
          href={base}
          className="match__when"
          style={{ color: "var(--accent)", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          Ver todo →
        </Link>
      </summary>
      <div style={{ borderTop: "1px solid var(--line)", padding: "4px 12px 12px" }}>
        {live.length > 0 && (
          <div>
            <GroupLabel>En juego</GroupLabel>
            <div className="hmrowlist">
              {live.map((fx) => (
                <CompactMatchRow key={fx.fixture.id} fx={fx} href={`${base}/partido/${fx.fixture.id}`} />
              ))}
            </div>
          </div>
        )}
        {todayNonLive.length > 0 && (
          <div>
            <GroupLabel>{anyLive ? "Más partidos hoy" : "Partidos de hoy"}</GroupLabel>
            <div className="hmrowlist">
              {todayNonLive.map((fx) => (
                <CompactMatchRow key={fx.fixture.id} fx={fx} href={`${base}/partido/${fx.fixture.id}`} />
              ))}
            </div>
          </div>
        )}
        {recentResults.length > 0 && (
          <div>
            <GroupLabel>Resultados recientes</GroupLabel>
            <div className="hmrowlist">
              {recentResults.map((fx) => (
                <CompactMatchRow key={fx.fixture.id} fx={fx} href={`${base}/partido/${fx.fixture.id}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

/**
 * Contenido de la pestaña "Marcador en vivo"/"Fútbol de hoy" (envuelto por
 * `HomeScoreboardTabs`, que pone la cabecera y el selector de pestañas
 * compartido con el calendario). Una competición por desplegable (no se
 * mezclan los partidos de distintas ligas, para evitar confusión con varias
 * competiciones activas a la vez). Se actualiza sola cada 30s mientras haya
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

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <CompetitionAccordion key={g.competition.slug} group={g} />
      ))}
    </div>
  );
}
