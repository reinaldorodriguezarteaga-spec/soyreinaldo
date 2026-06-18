"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { PlayerRating } from "@/lib/sports/api-football";

type Team = { name: string; logo: string };
type Entry = { p: PlayerRating; team: Team };

const POS_ES: Record<string, string> = { G: "POR", D: "DEF", M: "MED", F: "DEL" };

function ratingColor(r: number): string {
  if (r >= 7.5) return "#4ade80";
  if (r >= 6.5) return "var(--text)";
  return "#ff8a8a";
}

function statLines(p: PlayerRating): { label: string; value: string }[] {
  const s = p.stats;
  const out: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null) => {
    if (value != null) out.push({ label, value });
  };
  push("Minutos jugados", p.minutes != null ? `${p.minutes}'` : null);
  push("Goles", String(p.goals));
  push("Asistencias", String(p.assists));
  if (s.shotsTotal != null)
    push(
      "Tiros",
      s.shotsOn != null ? `${s.shotsTotal} (${s.shotsOn} a puerta)` : String(s.shotsTotal),
    );
  if (s.passesTotal != null)
    push(
      "Pases",
      s.passesAcc != null ? `${s.passesTotal} · ${s.passesAcc}%` : String(s.passesTotal),
    );
  if (s.passesKey != null) push("Pases clave", String(s.passesKey));
  if (s.dribblesAttempts != null || s.dribblesSuccess != null)
    push("Regates", `${s.dribblesSuccess ?? 0}/${s.dribblesAttempts ?? 0}`);
  if (s.duelsTotal != null) push("Duelos", `${s.duelsWon ?? 0}/${s.duelsTotal}`);
  if (s.tackles != null) push("Entradas", String(s.tackles));
  if (s.interceptions != null) push("Intercepciones", String(s.interceptions));
  if (s.foulsCommitted != null) push("Faltas cometidas", String(s.foulsCommitted));
  if (s.foulsDrawn != null) push("Faltas recibidas", String(s.foulsDrawn));
  if (s.saves != null) push("Paradas", String(s.saves));
  if (s.yellow > 0) push("Amarillas", String(s.yellow));
  if (s.red > 0) push("Rojas", String(s.red));
  return out;
}

function highlights(e: Entry, maxRating: number, maxShots: number): string[] {
  const { p } = e;
  const out: string[] = [];
  if (p.goals > 0) out.push(`Marcó ${p.goals} ${p.goals === 1 ? "gol" : "goles"}`);
  if (p.assists > 0)
    out.push(`Dio ${p.assists} ${p.assists === 1 ? "asistencia" : "asistencias"}`);
  if (p.rating != null && p.rating === maxRating)
    out.push("Mejor valorado del partido");
  if (p.stats.shotsTotal != null && p.stats.shotsTotal === maxShots && maxShots > 0)
    out.push(`Más tiros del partido (${maxShots})`);
  if (p.stats.red > 0) out.push("Fue expulsado");
  return out;
}

function Avatar({ photo, n, size }: { photo: string | null; n: number | null; size: number }) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={{
          borderRadius: "50%",
          objectFit: "cover",
          background: "var(--surface-2)",
          flex: "none",
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--surface-2)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size > 40 ? "1.1rem" : "0.66rem",
        color: "var(--text-dim)",
        flex: "none",
      }}
    >
      {n ?? "—"}
    </span>
  );
}

function RatingBadge({ rating, big }: { rating: number | null; big?: boolean }) {
  return (
    <b
      className="tabular-nums"
      style={{
        color: big ? "var(--on-accent)" : ratingColor(rating ?? 0),
        background: big ? ratingColor(rating ?? 0) : undefined,
        borderRadius: big ? 8 : undefined,
        padding: big ? "2px 8px" : undefined,
        fontSize: big ? "1rem" : "0.95rem",
      }}
    >
      {rating != null ? rating.toFixed(1) : "—"}
    </b>
  );
}

export default function PlayerRatings({
  home,
  away,
  homePlayers,
  awayPlayers,
}: {
  home: Team;
  away: Team;
  homePlayers: PlayerRating[];
  awayPlayers: PlayerRating[];
}) {
  const entries: Entry[] = [
    ...homePlayers.map((p) => ({ p, team: home })),
    ...awayPlayers.map((p) => ({ p, team: away })),
  ];
  const maxRating = Math.max(...entries.map((e) => e.p.rating ?? 0));
  const maxShots = Math.max(...entries.map((e) => e.p.stats.shotsTotal ?? 0));

  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open == null) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(null);
      if (ev.key === "ArrowLeft") setOpen((i) => (i! > 0 ? i! - 1 : i));
      if (ev.key === "ArrowRight")
        setOpen((i) => (i! < entries.length - 1 ? i! + 1 : i));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, entries.length]);

  return (
    <div>
      <div className="shead">
        <h2>Valoraciones</h2>
        <span className="sh-note">toca un jugador para ver su detalle</span>
      </div>
      <div className="grid2" style={{ alignItems: "start" }}>
        {[
          { team: home, players: homePlayers, offset: 0 },
          { team: away, players: awayPlayers, offset: homePlayers.length },
        ].map(({ team, players, offset }) => (
          <div key={team.name}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Image src={team.logo} alt="" width={22} height={22} unoptimized />
              <b>{team.name}</b>
            </div>
            <div className="panel" style={{ overflow: "hidden" }}>
              {players.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpen(offset + i)}
                  className="prowbtn"
                >
                  <Avatar photo={p.photo} n={p.number} size={28} />
                  <span
                    className="mono"
                    style={{ width: 30, fontSize: "0.62rem", color: "var(--text-dim)" }}
                  >
                    {p.position ? (POS_ES[p.position] ?? p.position) : ""}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textAlign: "left",
                    }}
                  >
                    {p.name}
                    {p.captain ? (
                      <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}> (C)</span>
                    ) : null}
                    {p.goals > 0 ? <span> {"⚽".repeat(p.goals)}</span> : null}
                    {p.assists > 0 ? (
                      <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}> · {p.assists}A</span>
                    ) : null}
                  </span>
                  <RatingBadge rating={p.rating} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {open != null && (
        <PlayerModal
          entry={entries[open]}
          highlights={highlights(entries[open], maxRating, maxShots)}
          hasPrev={open > 0}
          hasNext={open < entries.length - 1}
          onPrev={() => setOpen((i) => (i! > 0 ? i! - 1 : i))}
          onNext={() => setOpen((i) => (i! < entries.length - 1 ? i! + 1 : i))}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function PlayerModal({
  entry,
  highlights,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  entry: Entry;
  highlights: string[];
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { p, team } = entry;
  const lines = statLines(p);

  return (
    <div className="pmodal-backdrop" onClick={onClose} role="dialog" aria-modal>
      <div className="pmodal" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera con foto + nota + flechas */}
        <div className="pmodal-head">
          <button
            type="button"
            className="pmodal-nav"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Anterior"
          >
            ‹
          </button>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar photo={p.photo} n={p.number} size={76} />
            <span
              style={{ position: "absolute", top: -6, right: -10 }}
            >
              <RatingBadge rating={p.rating} big />
            </span>
            {team.logo ? (
              <Image
                src={team.logo}
                alt=""
                width={24}
                height={24}
                unoptimized
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -6,
                  borderRadius: "50%",
                  background: "var(--surface)",
                  padding: 1,
                }}
              />
            ) : null}
          </div>
          <button
            type="button"
            className="pmodal-nav"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>

        <h3 style={{ textAlign: "center", margin: "8px 0 16px", fontSize: "1.2rem", fontWeight: 800 }}>
          {p.name}
        </h3>

        <div className="pmodal-meta">
          <Meta label="Posición" value={p.position ? (POS_ES[p.position] ?? p.position) : "—"} />
          <Meta
            label="Selección"
            value={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <Image src={team.logo} alt="" width={18} height={18} unoptimized />
                {team.name}
              </span>
            }
          />
          <Meta label="Dorsal" value={p.number != null ? `#${p.number}` : "—"} />
        </div>

        {highlights.length > 0 && (
          <div className="pmodal-hl">
            <p className="linkcard__tag" style={{ color: "#4ade80" }}>Destacados</p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
              {highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="shead" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: "1.1rem" }}>Estadísticas</h2>
        </div>
        <div className="panel" style={{ overflow: "hidden" }}>
          {lines.map((l, i) => (
            <div
              key={l.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 14px",
                borderBottom: i < lines.length - 1 ? "1px solid var(--line)" : undefined,
                fontSize: "0.9rem",
              }}
            >
              <span style={{ color: "var(--text-dim)" }}>{l.label}</span>
              <b className="tabular-nums">{l.value}</b>
            </div>
          ))}
        </div>

        <button type="button" className="btn btn--ghost" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>
          Hecho
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{value}</div>
      <div className="mono" style={{ color: "var(--text-dim)", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}
