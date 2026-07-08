"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlayerSearchResult } from "@/lib/sports/api-football";

type Team = { id: number; name: string; logo: string };

/**
 * Buscador del Mundial: filtra selecciones al instante (lista local) y busca
 * jugadores con debounce contra /api/sports/search-players (≥3 letras).
 */
export default function SearchBox({ teams }: { teams: Team[] }) {
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const term = q.trim().toLowerCase();

  const teamHits = useMemo(() => {
    if (term.length < 2) return [];
    return teams.filter((t) => t.name.toLowerCase().includes(term)).slice(0, 8);
  }, [teams, term]);

  useEffect(() => {
    if (term.length < 3) {
      setPlayers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(() => {
      fetch(`/api/sports/search-players?q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d: PlayerSearchResult[]) => {
          if (!cancelled) setPlayers(Array.isArray(d) ? d : []);
        })
        .catch(() => {
          if (!cancelled) setPlayers([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, term]);

  return (
    <div>
      <input
        type="search"
        className="field"
        placeholder="Busca una selección o un jugador…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        style={{ width: "100%", fontSize: "1rem" }}
        aria-label="Buscar selección o jugador"
      />

      {term.length < 2 ? (
        <p style={{ color: "var(--text-dim)", marginTop: 20, textAlign: "center" }}>
          Escribe al menos 2 letras para buscar selecciones, 3 para jugadores.
        </p>
      ) : (
        <div style={{ marginTop: 22 }}>
          {teamHits.length > 0 && (
            <>
              <Subhead>Selecciones</Subhead>
              <div className="panel" style={{ overflow: "hidden", marginBottom: 22 }}>
                {teamHits.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/mundial/equipo/${t.id}`}
                    className="rowlink"
                    style={rowStyle(i, teamHits.length)}
                  >
                    <Image src={t.logo} alt="" width={26} height={26} unoptimized />
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span style={{ marginLeft: "auto", color: "var(--accent)" }}>→</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {term.length >= 3 && (
            <>
              <Subhead>Jugadores</Subhead>
              {loading && players.length === 0 ? (
                <p style={{ color: "var(--text-dim)", padding: "8px 2px" }}>Buscando…</p>
              ) : players.length > 0 ? (
                <div className="panel" style={{ overflow: "hidden" }}>
                  {players.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/mundial/jugador/${p.id}`}
                      className="rowlink"
                      style={rowStyle(i, players.length)}
                    >
                      {p.photo ? (
                        <Image
                          src={p.photo}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          style={{ borderRadius: "50%", background: "var(--surface-2)" }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "var(--surface-2)",
                          }}
                        />
                      )}
                      <span style={{ fontWeight: 600, minWidth: 0 }} className="truncate">
                        {p.name}
                      </span>
                      {p.team && (
                        <span
                          style={{
                            marginLeft: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: "var(--text-dim)",
                            fontSize: "0.82rem",
                          }}
                        >
                          <Image src={p.team.logo} alt="" width={18} height={18} unoptimized />
                          <span className="truncate" style={{ maxWidth: 110 }}>
                            {p.team.name}
                          </span>
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-dim)", padding: "8px 2px" }}>
                  Sin jugadores para “{q.trim()}”.
                </p>
              )}
            </>
          )}

          {teamHits.length === 0 && term.length < 3 && (
            <p style={{ color: "var(--text-dim)", padding: "8px 2px" }}>
              Sin selecciones para “{q.trim()}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
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
        margin: "0 0 8px",
      }}
    >
      {children}
    </p>
  );
}

function rowStyle(i: number, total: number): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    borderBottom: i < total - 1 ? "1px solid var(--line)" : undefined,
    color: "inherit",
    textDecoration: "none",
  };
}
