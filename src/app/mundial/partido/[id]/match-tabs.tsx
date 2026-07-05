"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { H2HData } from "@/app/api/sports/h2h/route";
import type { PreviewData } from "@/app/api/sports/preview/route";
import type {
  Injury,
  LineupTeam,
  MatchOdds,
  MatchPrediction,
} from "@/lib/sports/api-football";
import { SkeletonCard } from "@/components/Skeleton";

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type Team = { id: number; name: string; logo: string };

/**
 * Pestañas del detalle de partido: "Estadísticas" (server, como children),
 * "Previa" (probabilidades / bajas / alineaciones / cuotas) y "Cara a cara"
 * (historial). Previa y H2H se cargan BAJO DEMANDA al abrir su pestaña, para no
 * gastar quota en cada visita.
 */
export default function MatchTabs({
  fixtureId,
  home,
  away,
  initialTab = "stats",
  children,
}: {
  fixtureId: number;
  home: Team;
  away: Team;
  /** Pestaña inicial: "preview" para partidos por jugarse (Estadísticas vacía). */
  initialTab?: "stats" | "preview";
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<"stats" | "preview" | "h2h">(initialTab);
  const [previewOpened, setPreviewOpened] = useState(initialTab === "preview");
  const [h2hOpened, setH2hOpened] = useState(false);

  return (
    <>
      <div className="tabs" style={{ marginBottom: 24, maxWidth: 640 }}>
        <button
          type="button"
          className={tab === "stats" ? "on" : ""}
          onClick={() => setTab("stats")}
        >
          Estadísticas
        </button>
        <button
          type="button"
          className={tab === "preview" ? "on" : ""}
          onClick={() => {
            setTab("preview");
            setPreviewOpened(true);
          }}
        >
          Previa
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

      {previewOpened && (
        <div hidden={tab !== "preview"}>
          <PreviewPanel fixtureId={fixtureId} home={home} away={away} />
        </div>
      )}

      {h2hOpened && (
        <div hidden={tab !== "h2h"}>
          <H2HPanel
            homeId={home.id}
            awayId={away.id}
            homeName={home.name}
            awayName={away.name}
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
      <div className="space-y-2" aria-busy>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
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

/* ------------------------------ Previa ------------------------------ */

function PreviewPanel({
  fixtureId,
  home,
  away,
}: {
  fixtureId: number;
  home: Team;
  away: Team;
}) {
  const [data, setData] = useState<PreviewData | null | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sports/preview?fixture=${fixtureId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PreviewData | null) => {
        if (!cancelled) setData(d ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  if (data === "loading") {
    return (
      <div className="space-y-6" aria-busy>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const pred = data?.prediction ?? null;
  const injuries = data?.injuries ?? [];
  const lineups = data?.lineups ?? [];
  const odds = data?.odds ?? null;
  const homeLineup = lineups.find((l) => l.teamId === home.id) ?? null;
  const awayLineup = lineups.find((l) => l.teamId === away.id) ?? null;
  const hasLineups =
    (homeLineup?.startXI.length ?? 0) + (awayLineup?.startXI.length ?? 0) > 0;

  if (!pred && injuries.length === 0 && !hasLineups && !odds) {
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
        La previa (probabilidades, bajas y alineaciones) aparece cuando el
        proveedor la publica, normalmente en los días u horas previas al partido.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pred && <PredictionCard pred={pred} home={home} away={away} />}
      {hasLineups && (
        <LineupCard
          home={home}
          away={away}
          homeLineup={homeLineup}
          awayLineup={awayLineup}
        />
      )}
      {injuries.length > 0 && (
        <InjuriesCard
          home={home}
          away={away}
          homeInj={injuries.filter((i) => i.teamId === home.id)}
          awayInj={injuries.filter((i) => i.teamId === away.id)}
        />
      )}
      {odds && <OddsCard odds={odds} home={home} away={away} />}
    </div>
  );
}

function PredictionCard({
  pred,
  home,
  away,
}: {
  pred: MatchPrediction;
  home: Team;
  away: Team;
}) {
  const { home: h, draw: d, away: a } = pred.percent;
  const total = h + d + a || 1;
  const seg = (v: number) => `${(v / total) * 100}%`;
  return (
    <div className="panel" style={{ padding: "18px 20px" }}>
      <div className="shead" style={{ marginBottom: 14 }}>
        <h2>Probabilidades</h2>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontSize: "0.8rem",
          marginBottom: 4,
        }}
      >
        <span className="truncate" style={{ fontWeight: 700, maxWidth: "40%" }}>
          {home.name}
        </span>
        <span className="mono" style={{ color: "var(--text-dim)" }}>
          Empate
        </span>
        <span
          className="truncate"
          style={{ fontWeight: 700, maxWidth: "40%", textAlign: "right" }}
        >
          {away.name}
        </span>
      </div>
      <div
        className="tabular-nums"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "1.15rem",
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--accent)" }}>{h}%</span>
        <span style={{ color: "var(--text-dim)" }}>{d}%</span>
        <span style={{ color: "#ff5b8a" }}>{a}%</span>
      </div>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          background: "var(--surface-2)",
        }}
      >
        <span style={{ width: seg(h), background: "var(--accent)" }} />
        <span style={{ width: seg(d), background: "var(--line-strong)" }} />
        <span style={{ width: seg(a), background: "#ff5b8a" }} />
      </div>
      {pred.form && (
        <p
          className="mono"
          style={{
            color: "var(--text-dim)",
            fontSize: "0.66rem",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          Forma reciente · {home.name} {pred.form.home}% — {pred.form.away}%{" "}
          {away.name}
        </p>
      )}
      {pred.advice && (
        <p style={{ marginTop: 12, fontSize: "0.85rem", lineHeight: 1.5 }}>
          <span
            className="mono"
            style={{
              display: "block",
              color: "var(--text-dim)",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 3,
            }}
          >
            Consejo del análisis
          </span>
          {pred.advice}
        </p>
      )}
      <p
        className="mono"
        style={{ color: "var(--text-dim)", fontSize: "0.58rem", marginTop: 12 }}
      >
        Estimación estadística de API-Football, no una certeza.
      </p>
    </div>
  );
}

function LineupCard({
  home,
  away,
  homeLineup,
  awayLineup,
}: {
  home: Team;
  away: Team;
  homeLineup: LineupTeam | null;
  awayLineup: LineupTeam | null;
}) {
  return (
    <div className="panel" style={{ padding: "18px 20px" }}>
      <div className="shead" style={{ marginBottom: 14 }}>
        <h2>Alineaciones</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <TeamLineup team={home} lineup={homeLineup} />
        <TeamLineup team={away} lineup={awayLineup} />
      </div>
    </div>
  );
}

function TeamLineup({ team, lineup }: { team: Team; lineup: LineupTeam | null }) {
  return (
    <div>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <Image src={team.logo} alt="" width={22} height={22} unoptimized />
        <b className="truncate" style={{ fontSize: "0.9rem" }}>
          {team.name}
        </b>
        {lineup?.formation && (
          <span
            className="mono"
            style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "0.72rem" }}
          >
            {lineup.formation}
          </span>
        )}
      </div>
      {lineup && lineup.startXI.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {lineup.startXI.map((p) => (
            <li
              key={p.id}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "baseline",
                padding: "4px 0",
                fontSize: "0.84rem",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span
                className="mono tabular-nums"
                style={{ color: "var(--text-dim)", width: 20, textAlign: "right" }}
              >
                {p.number ?? "–"}
              </span>
              <span className="truncate">{p.name}</span>
              {p.pos && (
                <span
                  className="mono"
                  style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "0.68rem" }}
                >
                  {p.pos}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint" style={{ margin: 0 }}>
          Aún sin confirmar.
        </p>
      )}

      {lineup && lineup.substitutes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p
            className="mono"
            style={{
              color: "var(--text-dim)",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            Suplentes
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lineup.substitutes.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "baseline",
                  padding: "3px 0",
                  fontSize: "0.8rem",
                  color: "var(--text-dim)",
                }}
              >
                <span
                  className="mono tabular-nums"
                  style={{ width: 20, textAlign: "right" }}
                >
                  {p.number ?? "–"}
                </span>
                <span className="truncate" style={{ color: "var(--text)" }}>
                  {p.name}
                </span>
                {p.pos && (
                  <span
                    className="mono"
                    style={{ marginLeft: "auto", fontSize: "0.66rem" }}
                  >
                    {p.pos}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InjuriesCard({
  home,
  away,
  homeInj,
  awayInj,
}: {
  home: Team;
  away: Team;
  homeInj: Injury[];
  awayInj: Injury[];
}) {
  return (
    <div className="panel" style={{ padding: "18px 20px" }}>
      <div className="shead" style={{ marginBottom: 14 }}>
        <h2>Bajas y dudas</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <TeamInjuries team={home} list={homeInj} />
        <TeamInjuries team={away} list={awayInj} />
      </div>
    </div>
  );
}

function TeamInjuries({ team, list }: { team: Team; list: Injury[] }) {
  return (
    <div>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <Image src={team.logo} alt="" width={22} height={22} unoptimized />
        <b className="truncate" style={{ fontSize: "0.9rem" }}>
          {team.name}
        </b>
      </div>
      {list.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {list.map((i) => (
            <li
              key={i.playerId}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "baseline",
                padding: "5px 0",
                fontSize: "0.84rem",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
              title={i.type === "Questionable" ? "Duda" : "Baja"}
            >
              <span>{i.type === "Questionable" ? "⚠️" : "🚫"}</span>
              <span className="truncate">{i.player}</span>
              <span
                className="mono"
                style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "0.68rem" }}
              >
                {reasonEs(i.reason)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint" style={{ margin: 0 }}>
          Sin bajas confirmadas.
        </p>
      )}
    </div>
  );
}

function reasonEs(r: string | null): string {
  if (!r) return "";
  const map: Record<string, string> = {
    Injury: "Lesión",
    Suspended: "Sanción",
    "Red card": "Expulsión",
    "Yellow cards": "Sanción",
    "Coach's decision": "Decisión técnica",
    "National selection": "Otra selección",
  };
  return map[r] ?? r;
}

function OddsCell({ label, val }: { label: string; val: number | null }) {
  return (
    <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
      <div
        className="mono truncate"
        style={{
          color: "var(--text-dim)",
          fontSize: "0.58rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div className="display tabular-nums" style={{ fontSize: "1.4rem" }}>
        {val != null ? val.toFixed(2) : "—"}
      </div>
    </div>
  );
}

function OddsCard({
  odds,
  home,
  away,
}: {
  odds: MatchOdds;
  home: Team;
  away: Team;
}) {
  return (
    <div className="panel" style={{ padding: "18px 20px" }}>
      <div className="shead" style={{ marginBottom: 14 }}>
        <h2>Cuotas 1X2</h2>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <OddsCell label={home.name} val={odds.home} />
        <OddsCell label="Empate" val={odds.draw} />
        <OddsCell label={away.name} val={odds.away} />
      </div>
      <p
        className="mono"
        style={{
          color: "var(--text-dim)",
          fontSize: "0.58rem",
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Cuotas de {odds.bookmaker} · solo informativo (18+).
      </p>
    </div>
  );
}
