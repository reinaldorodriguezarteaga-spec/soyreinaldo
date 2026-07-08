"use client";

import { useState } from "react";
import type { PlayerExtras as Extras } from "@/lib/sports/api-football";

function yearOf(d: string | null): string {
  if (!d) return "";
  const m = d.match(/(\d{4})/);
  return m ? m[1] : "";
}

/** Traduce el tipo/monto del fichaje del API a algo legible en español. */
function feeLabel(type: string | null): string | null {
  if (!type || /^n\/?a$/i.test(type.trim())) return null;
  if (/loan/i.test(type)) return "Préstamo";
  if (/free/i.test(type)) return "Libre";
  return type; // "€ 45M", etc.
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mono"
      style={{
        color: "var(--text-dim)",
        fontSize: "0.62rem",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        margin: "20px 0 8px",
      }}
    >
      {children}
    </p>
  );
}

/**
 * Palmarés (agrupado por competición con los años, desplegable), fichajes
 * (con tipo/monto) e historial de lesiones. Compartido por el modal de la
 * pestaña Estadísticas y la página de jugador.
 */
export default function PlayerExtras({ extras }: { extras: Extras }) {
  const { trophies, transfers, sidelined } = extras;
  const [showAll, setShowAll] = useState(false);

  if (trophies.length === 0 && transfers.length === 0 && sidelined.length === 0)
    return null;

  const LIMIT = 6;
  const shownTrophies = showAll ? trophies : trophies.slice(0, LIMIT);
  const hiddenCount = trophies.length - shownTrophies.length;

  return (
    <div>
      {trophies.length > 0 && (
        <>
          <Subhead>Palmarés</Subhead>
          <div className="panel" style={{ overflow: "hidden" }}>
            {shownTrophies.map((t, i) => (
              <div
                key={t.league}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderBottom:
                    i < shownTrophies.length - 1 ? "1px solid var(--line)" : undefined,
                  fontSize: "0.86rem",
                }}
              >
                <span style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden>🏆</span>
                  <span className="truncate">
                    {t.league}
                    {t.seasons.length > 1 && (
                      <span style={{ color: "var(--text-dim)" }}> ×{t.seasons.length}</span>
                    )}
                  </span>
                </span>
                <span
                  className="mono tabular-nums"
                  style={{ color: "var(--text-dim)", fontSize: "0.68rem", flexShrink: 0, textAlign: "right" }}
                >
                  {t.seasons.join(", ")}
                </span>
              </div>
            ))}
          </div>
          {trophies.length > LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mono"
              style={{
                marginTop: 8,
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: "0.72rem",
                padding: 4,
              }}
            >
              {showAll ? "Ver menos" : `Ver todo (+${hiddenCount})`}
            </button>
          )}
        </>
      )}

      {transfers.length > 0 && (
        <>
          <Subhead>Fichajes recientes</Subhead>
          <div className="panel" style={{ overflow: "hidden" }}>
            {transfers.map((t, i) => {
              const fee = feeLabel(t.type);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 14px",
                    borderBottom: i < transfers.length - 1 ? "1px solid var(--line)" : undefined,
                    fontSize: "0.84rem",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    {t.teamOut?.name ?? "—"}{" "}
                    <span style={{ color: "var(--text-dim)" }}>→</span>{" "}
                    <b>{t.teamIn?.name ?? "—"}</b>
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    {fee && (
                      <span
                        style={{
                          background: "var(--surface-2)",
                          borderRadius: 6,
                          padding: "2px 7px",
                          fontSize: "0.68rem",
                          fontWeight: 600,
                        }}
                      >
                        {fee}
                      </span>
                    )}
                    <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.66rem" }}>
                      {yearOf(t.date)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {sidelined.length > 0 && (
        <>
          <Subhead>Lesiones y sanciones</Subhead>
          <div className="panel" style={{ overflow: "hidden" }}>
            {sidelined.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "9px 14px",
                  borderBottom: i < sidelined.length - 1 ? "1px solid var(--line)" : undefined,
                  fontSize: "0.84rem",
                }}
              >
                <span className="truncate">{s.type}</span>
                <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.66rem", flexShrink: 0 }}>
                  {yearOf(s.start)}
                  {yearOf(s.end) && yearOf(s.end) !== yearOf(s.start) ? `–${yearOf(s.end)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
