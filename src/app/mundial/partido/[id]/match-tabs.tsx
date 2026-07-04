"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { H2HData } from "@/app/api/sports/h2h/route";

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Pestañas del detalle de partido: "Estadísticas" (contenido ya renderizado en
 * el servidor, pasado como children) y "Cara a cara" (historial de
 * enfrentamientos, cargado bajo demanda al abrir la pestaña para no gastar
 * quota en cada visita).
 */
export default function MatchTabs({
  homeId,
  awayId,
  homeName,
  awayName,
  children,
}: {
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<"stats" | "h2h">("stats");
  const [h2hOpened, setH2hOpened] = useState(false);

  return (
    <>
      <div className="tabs" style={{ marginBottom: 24, maxWidth: 520 }}>
        <button
          type="button"
          className={tab === "stats" ? "on" : ""}
          onClick={() => setTab("stats")}
        >
          Estadísticas
        </button>
        <button
          type="button"
          className={tab === "h2h" ? "on" : ""}
          onClick={() => {
            setTab("h2h");
            setH2hOpened(true);
          }}
        >
          Cara a cara
        </button>
      </div>

      <div hidden={tab !== "stats"}>{children}</div>

      {h2hOpened && (
        <div hidden={tab !== "h2h"}>
          <H2HPanel
            homeId={homeId}
            awayId={awayId}
            homeName={homeName}
            awayName={awayName}
          />
        </div>
      )}
    </>
  );
}

function H2HPanel({
  homeId,
  awayId,
  homeName,
  awayName,
}: {
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
}) {
  const [data, setData] = useState<H2HData | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sports/h2h?a=${homeId}&b=${awayId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: H2HData | null) => {
        if (!cancelled) setData(d ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [homeId, awayId]);

  if (data === "loading") {
    return (
      <p style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)" }}>
        Cargando enfrentamientos…
      </p>
    );
  }

  if (!data || data.matches.length === 0) {
    return (
      <div
        className="panel"
        style={{
          padding: 28,
          textAlign: "center",
          borderStyle: "dashed",
          color: "var(--text-dim)",
        }}
      >
        No hay enfrentamientos previos registrados entre estos equipos.
      </div>
    );
  }

  const { summary, matches } = data;

  return (
    <div className="space-y-6">
      {summary.played > 0 && (
        <div className="panel" style={{ padding: "18px 20px" }}>
          <p
            className="mono"
            style={{
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: "0.6rem",
              marginBottom: 12,
            }}
          >
            {summary.played} enfrentamiento{summary.played === 1 ? "" : "s"}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              textAlign: "center",
              gap: 12,
            }}
          >
            <Tally value={summary.aWins} label={homeName} />
            <Tally value={summary.draws} label="Empates" muted />
            <Tally value={summary.bWins} label={awayName} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {matches.map((m) => {
          const played = m.finished && m.home.goals != null && m.away.goals != null;
          const homeWon = played && m.home.goals! > m.away.goals!;
          const awayWon = played && m.away.goals! > m.home.goals!;
          return (
            <Link
              key={m.id}
              href={`/mundial/partido/${m.id}`}
              className="panel"
              style={{
                display: "block",
                padding: "12px 14px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <p
                className="mono"
                style={{
                  color: "var(--text-dim)",
                  fontSize: "0.58rem",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span className="truncate">{m.league}</span>
                <span>{DATE_FMT.format(new Date(m.date))}</span>
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  gap: 10,
                  fontSize: "0.9rem",
                }}
              >
                <span
                  className="flex items-center gap-2"
                  style={{ minWidth: 0, opacity: played && !homeWon ? 0.6 : 1 }}
                >
                  <Image src={m.home.logo} alt="" width={20} height={20} unoptimized />
                  <span className="truncate" style={{ fontWeight: homeWon ? 700 : 500 }}>
                    {m.home.name}
                  </span>
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontWeight: 800, whiteSpace: "nowrap" }}
                >
                  {played ? `${m.home.goals} – ${m.away.goals}` : "vs"}
                </span>
                <span
                  className="flex items-center gap-2"
                  style={{
                    minWidth: 0,
                    justifyContent: "flex-end",
                    opacity: played && !awayWon ? 0.6 : 1,
                  }}
                >
                  <span className="truncate" style={{ fontWeight: awayWon ? 700 : 500 }}>
                    {m.away.name}
                  </span>
                  <Image src={m.away.logo} alt="" width={20} height={20} unoptimized />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Tally({
  value,
  label,
  muted,
}: {
  value: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div
        className="display"
        style={{ fontSize: "1.8rem", color: muted ? "var(--text-dim)" : "var(--accent)" }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--text-dim)",
          marginTop: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}
