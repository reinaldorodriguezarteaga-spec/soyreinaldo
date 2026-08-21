"use client";

import { useState } from "react";
import { isLive } from "@/lib/sports/api-football";
import ScrollHintTabs from "@/components/ScrollHintTabs";
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
  // Sincroniza con `?v=` al navegar SIN efecto (ajuste durante el render,
  // patrón de react.dev "adjusting state when props change") — setState
  // dentro de un useEffect es error de lint aquí (react-hooks/set-state-in-effect).
  const [prevView, setPrevView] = useState(view);
  if (prevView !== view) {
    setPrevView(view);
    setTab(view);
  }

  const anyLive = data.today.some(isLive);

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        {/* ScrollHintTabs sustituye a la copia inline del degradado+flecha
            que había aquí: misma pista visual, pero la flecha es un BOTÓN
            que desplaza la barra (la copia vieja era decorativa y el toque
            la atravesaba — mismo bug reportado en la quiniela). */}
        <div style={{ marginBottom: 28 }}>
          <ScrollHintTabs>
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
            {/* Separador: a la izquierda, partidos por tiempo (en vivo/próximos/
                finalizados); a la derecha, datos de la competición. */}
            <span className="tabs__divider" aria-hidden />
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
          </ScrollHintTabs>
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
