"use client";

import { useState } from "react";
import type { Fixture } from "@/lib/sports/api-football";
import CompactMatchRow from "@/components/CompactMatchRow";

const PER_PAGE = 10;
const MADRID_TZ = "Europe/Madrid";

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayLabel(iso: string, todayKey: string, tomorrowKey: string, yesterdayKey: string): string {
  const k = dayKey(iso);
  if (k === todayKey) return "Hoy";
  if (k === tomorrowKey) return "Mañana";
  if (k === yesterdayKey) return "Ayer";
  const d = new Date(iso);
  const wd = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID_TZ, weekday: "short" }).format(d);
  const day = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID_TZ, day: "numeric" }).format(d);
  const mon = new Intl.DateTimeFormat("es-ES", { timeZone: MADRID_TZ, month: "short" }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${day} ${mon}`.replace(/\./g, "");
}

/**
 * Historial+calendario del equipo en una única lista cronológica (pasado y
 * futuro juntos, estilo FotMob), paginada de 10 en 10 y agrupada por día.
 * Arranca en la página del próximo partido para caer cerca del "ahora".
 */
export default function TeamFixturesList({
  fixtures,
  slug,
}: {
  fixtures: Fixture[];
  slug: string;
}) {
  const pages = Math.max(1, Math.ceil(fixtures.length / PER_PAGE));

  // Página inicial: la que contiene el primer partido por jugarse. Se
  // calcula en el inicializador perezoso de useState —que corre una sola
  // vez— y no en el cuerpo del render: leer la hora en cada render es
  // impuro y podría mover la página sola al recomponer.
  // La hora de referencia se fija UNA vez al montar (inicializador perezoso):
  // sirve para la página inicial y para los rótulos hoy/ayer/mañana, y así no
  // se lee el reloj en cada render.
  const [ahora] = useState(() => Date.now());
  const [page, setPage] = useState(() => {
    const now = ahora;
    const nextIdx = fixtures.findIndex(
      (f) => new Date(f.fixture.date).getTime() > now,
    );
    return nextIdx >= 0 ? Math.floor(nextIdx / PER_PAGE) : pages - 1;
  });

  if (fixtures.length === 0) {
    return (
      <div
        className="panel"
        style={{ padding: 28, textAlign: "center", borderStyle: "dashed", color: "var(--text-dim)" }}
      >
        No hay partidos de este equipo.
      </div>
    );
  }

  const start = page * PER_PAGE;
  const slice = fixtures.slice(start, start + PER_PAGE);

  const todayKey = dayKey(new Date(ahora).toISOString());
  const tomorrowKey = dayKey(new Date(ahora + 86400000).toISOString());
  const yesterdayKey = dayKey(new Date(ahora - 86400000).toISOString());

  // Agrupar los 10 de la página por día (para los rótulos).
  const groups: { key: string; label: string; items: Fixture[] }[] = [];
  for (const f of slice) {
    const k = dayKey(f.fixture.date);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(f);
    else groups.push({ key: k, label: dayLabel(f.fixture.date, todayKey, tomorrowKey, yesterdayKey), items: [f] });
  }

  return (
    <div>
      <div className="panel" style={{ overflow: "hidden" }}>
        {groups.map((g) => (
          <div key={g.key}>
            <p
              className="mono"
              style={{
                color: "var(--text-dim)",
                fontSize: "0.62rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                margin: 0,
                padding: "10px 14px 2px",
                borderTop: "1px solid var(--line)",
                background: "var(--surface-2)",
              }}
            >
              {g.label}
            </p>
            <div className="hmrowlist" style={{ padding: "0 8px" }}>
              {g.items.map((f) => (
                <CompactMatchRow
                  key={f.fixture.id}
                  fx={f}
                  href={`/liga/${slug}/partido/${f.fixture.id}`}
                  badge={f.league?.name}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginTop: 16,
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Anteriores
          </button>
          <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          >
            Siguientes →
          </button>
        </div>
      )}
    </div>
  );
}
