"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { BusquedaUniversal } from "@/app/api/sports/search/route";

const VACIO: BusquedaUniversal = { equipos: [], jugadores: [] };

/**
 * Buscador universal: equipos y jugadores de CUALQUIER liga, no solo de la
 * que estés viendo (buscar "chelsea" desde LaLiga no daba nada).
 *
 * Todo va contra /api/sports/search con debounce; el enlace del jugador pasa
 * por /jugador/[id], que resuelve su competición al abrirlo.
 */
export default function UniversalSearch({ inicial = "" }: { inicial?: string }) {
  const [q, setQ] = useState(inicial);
  // Los resultados guardan de QUÉ término son: así, mientras se teclea, no
  // se enseñan los de la búsqueda anterior (y el efecto no necesita
  // limpiarlos con un setState síncrono, que dispara renders en cascada).
  const [hecho, setHecho] = useState<{ term: string; data: BusquedaUniversal } | null>(
    null,
  );

  const term = q.trim();
  const res = hecho?.term === term ? hecho.data : VACIO;
  const cargando = term.length >= 3 && hecho?.term !== term;

  useEffect(() => {
    if (term.length < 3) return;
    let cancelado = false;
    const id = setTimeout(() => {
      fetch(`/api/sports/search?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : VACIO))
        .then((d: BusquedaUniversal) => {
          if (!cancelado) setHecho({ term, data: d?.equipos ? d : VACIO });
        })
        .catch(() => {
          if (!cancelado) setHecho({ term, data: VACIO });
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [term]);

  const sinNada =
    term.length >= 3 &&
    !cargando &&
    res.equipos.length === 0 &&
    res.jugadores.length === 0;

  return (
    <div>
      <input
        type="search"
        className="field"
        placeholder="Busca cualquier equipo o jugador…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        style={{ width: "100%", fontSize: "1rem" }}
        aria-label="Buscar equipo o jugador"
      />

      {term.length < 3 ? (
        <p style={{ color: "var(--text-dim)", marginTop: 20, textAlign: "center" }}>
          Escribe al menos 3 letras.
        </p>
      ) : (
        <div style={{ marginTop: 22 }}>
          {cargando && (
            <p style={{ color: "var(--text-dim)", padding: "8px 2px" }}>Buscando…</p>
          )}

          {res.equipos.length > 0 && (
            <>
              <Subhead>Equipos</Subhead>
              <div className="panel" style={{ overflow: "hidden", marginBottom: 22 }}>
                {res.equipos.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/liga/${t.slug}/equipo/${t.id}`}
                    className="rowlink"
                    style={fila(i, res.equipos.length)}
                  >
                    <Image src={t.logo} alt="" width={26} height={26} unoptimized />
                    <span style={{ fontWeight: 600, minWidth: 0 }} className="truncate">
                      {t.name}
                    </span>
                    {t.country && (
                      <span
                        style={{
                          marginLeft: "auto",
                          color: "var(--text-dim)",
                          fontSize: "0.82rem",
                        }}
                      >
                        {t.country}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}

          {res.jugadores.length > 0 && (
            <>
              <Subhead>Jugadores</Subhead>
              <div className="panel" style={{ overflow: "hidden" }}>
                {res.jugadores.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/jugador/${p.id}`}
                    className="rowlink"
                    style={fila(i, res.jugadores.length)}
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
                    {p.nationality && (
                      <span
                        style={{
                          marginLeft: "auto",
                          color: "var(--text-dim)",
                          fontSize: "0.82rem",
                        }}
                      >
                        {p.nationality}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}

          {sinNada && (
            <p style={{ color: "var(--text-dim)", padding: "8px 2px" }}>
              Nada para “{term}”.
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

function fila(i: number, total: number): React.CSSProperties {
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
