"use client";

import { useEffect, useRef, useState } from "react";
import { isLive } from "@/lib/sports/api-football";
import type { Competition } from "@/lib/sports/competitions";
import {
  EnVivoView,
  PartidosView,
  FinalizadosView,
  StandingsTableView,
  JugadoresView,
  StatsView,
  type LigaTab,
} from "@/components/competition/tab-views";
import type { LigaData } from "./page";

export type { LigaTab };

/**
 * Shell de pestañas de /liga/[slug] (equivalente a mundial-tabs.tsx, pero
 * genérico): compone las vistas compartidas de `tab-views.tsx` +
 * `StandingsTableView`. Sin pestañas "Grupos"/"Selecciones" (exclusivas del
 * formato Mundial) — "Tabla" las sustituye para competiciones de tabla plana
 * (se OCULTA si `standingsMode === "none"`, torneos de puro KO como Copa del
 * Rey/FA Cup/Supercopa). Sin pestaña "Bracket" tampoco: aunque la ruta
 * /liga/[slug]/bracket existe y funciona por URL directa para las
 * competiciones con `koStructure`, no hay hueco en esta barra para todas
 * las pestañas de todas las competiciones sin que se vuelva inmanejable.
 */
export default function LigaTabs({
  competition,
  data,
  view,
}: {
  competition: Competition;
  data: LigaData;
  view: LigaTab;
}) {
  const [tab, setTab] = useState<LigaTab>(view);
  useEffect(() => setTab(view), [view]);

  const tabsRef = useRef<HTMLDivElement>(null);
  const [moreRight, setMoreRight] = useState(false);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const update = () =>
      setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const anyLive = data.today.some(isLive);

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <div style={{ position: "relative", marginBottom: 28 }}>
          <div ref={tabsRef} className="tabs tabs--scroll">
            <button
              type="button"
              className={tab === "envivo" ? "on" : ""}
              onClick={() => setTab("envivo")}
            >
              {anyLive && (
                <span className="livepulse" style={{ marginRight: 7 }} />
              )}
              Marcador en vivo
            </button>
            <button
              type="button"
              className={tab === "partidos" ? "on" : ""}
              onClick={() => setTab("partidos")}
            >
              Próximos partidos
            </button>
            <button
              type="button"
              className={tab === "finalizados" ? "on" : ""}
              onClick={() => setTab("finalizados")}
            >
              Finalizados
            </button>
            {competition.standingsMode !== "none" && (
              <button
                type="button"
                className={tab === "tabla" ? "on" : ""}
                onClick={() => setTab("tabla")}
              >
                Tabla
              </button>
            )}
            <button
              type="button"
              className={tab === "jugadores" ? "on" : ""}
              onClick={() => setTab("jugadores")}
            >
              Jugadores
            </button>
            <button
              type="button"
              className={tab === "stats" ? "on" : ""}
              onClick={() => setTab("stats")}
            >
              Estadísticas
            </button>
          </div>
          {moreRight && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 5,
                bottom: 5,
                right: 5,
                width: 54,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 8,
                borderRadius: "var(--radius)",
                background: "linear-gradient(to right, transparent, var(--surface) 68%)",
              }}
            >
              <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", lineHeight: 1 }}>›</span>
            </div>
          )}
        </div>

        {tab === "envivo" && <EnVivoView competition={competition} initialToday={data.today} />}
        {tab === "partidos" && <PartidosView competition={competition} fixtures={data.fixtures} />}
        {tab === "finalizados" && <FinalizadosView competition={competition} fixtures={data.finished} />}
        {tab === "tabla" && <StandingsTableView competition={competition} standings={data.standings} />}
        {tab === "jugadores" && <JugadoresView competition={competition} />}
        {tab === "stats" && (
          <StatsView
            competition={competition}
            data={{
              scorers: data.scorers,
              assists: data.assists,
              ratings: data.ratings,
              cards: data.cards,
              attackDefense: data.attackDefense,
              standings: data.standings,
              finished: data.finished,
            }}
          />
        )}
      </div>
    </section>
  );
}
