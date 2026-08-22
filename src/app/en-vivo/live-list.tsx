"use client";

import { useEffect, useState } from "react";
import CompactMatchRow from "@/components/CompactMatchRow";
import type { LiveGroup } from "@/lib/sports/live-now";

/** Igual que el widget de portada: refresco cada 30 s, en pausa si la
 * pestaña no está a la vista (no gastar en quien no está mirando). */
const POLL_MS = 30_000;

/**
 * Lista de los partidos que se están jugando ahora, agrupados por
 * competición y con auto-refresco. Si no queda ninguno en juego, deja de
 * pedir y lo dice.
 */
export default function LiveList({ inicial }: { inicial: LiveGroup[] }) {
  const [grupos, setGrupos] = useState<LiveGroup[]>(inicial);

  useEffect(() => {
    let cancelado = false;

    async function tick() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/sports/live");
        if (!r.ok) return;
        const d: { grupos?: LiveGroup[] } = await r.json();
        if (!cancelado && Array.isArray(d.grupos)) setGrupos(d.grupos);
      } catch {
        // Un fallo de red no debe vaciar lo que ya se ve.
      }
    }

    const t = setInterval(tick, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(t);
    };
  }, []);

  const total = grupos.reduce((n, g) => n + g.fixtures.length, 0);

  if (total === 0) {
    return (
      <div
        className="panel"
        style={{
          padding: 32,
          textAlign: "center",
          borderStyle: "dashed",
          color: "var(--text-dim)",
        }}
      >
        Ahora mismo no se está jugando ningún partido de las competiciones que
        seguimos. Esta página se actualiza sola en cuanto empiece alguno.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grupos.map((g) => (
        <div key={g.slug} className="panel" style={{ overflow: "hidden" }}>
          <div
            className="flex items-center justify-between"
            style={{ padding: "14px 16px" }}
          >
            <b
              className="mono"
              style={{
                fontSize: "0.64rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {g.name}
            </b>
            <span className="badge badge--danger">
              <span className="livepulse" />
              {g.fixtures.length}
            </span>
          </div>
          <div style={{ borderTop: "1px solid var(--line)", padding: "4px 12px 12px" }}>
            <div className="hmrowlist">
              {g.fixtures.map((fx) => (
                <CompactMatchRow
                  key={fx.fixture.id}
                  fx={fx}
                  href={`/liga/${g.slug}/partido/${fx.fixture.id}`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
