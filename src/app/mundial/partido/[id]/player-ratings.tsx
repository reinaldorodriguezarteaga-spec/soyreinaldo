"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { LineupTeam, PlayerRating } from "@/lib/sports/api-football";

type Team = { id: number; name: string; logo: string };
type Entry = { p: PlayerRating; team: Team };

const POS_ES: Record<string, string> = { G: "POR", D: "DEF", M: "MED", F: "DEL" };

function ratingColor(r: number): string {
  if (r >= 7.5) return "#4ade80";
  if (r >= 6.5) return "var(--text)";
  return "#ff8a8a";
}

function shortName(name: string): string {
  const t = name.trim().split(/\s+/);
  return t.length > 1 ? t[t.length - 1] : name;
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
    push("Tiros", s.shotsOn != null ? `${s.shotsTotal} (${s.shotsOn} a puerta)` : String(s.shotsTotal));
  if (s.passesTotal != null)
    push("Pases", s.passesAcc != null ? `${s.passesTotal} · ${s.passesAcc}%` : String(s.passesTotal));
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
  if (p.assists > 0) out.push(`Dio ${p.assists} ${p.assists === 1 ? "asistencia" : "asistencias"}`);
  if (p.rating != null && p.rating === maxRating) out.push("Mejor valorado del partido");
  if (p.stats.shotsTotal != null && p.stats.shotsTotal === maxShots && maxShots > 0)
    out.push(`Más tiros del partido (${maxShots})`);
  if (p.stats.red > 0) out.push("Fue expulsado");
  return out;
}

function playerMark(p: PlayerRating | undefined): string | null {
  if (!p) return null;
  if (p.goals > 0) return "⚽";
  if (p.stats.red > 0) return "🟥";
  if (p.stats.yellow > 0) return "🟨";
  return null;
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
        style={{ borderRadius: "50%", objectFit: "cover", background: "var(--surface-2)", flex: "none" }}
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
        color: big ? "#0a1030" : ratingColor(rating ?? 0),
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

/* ---------- Vista CAMPO (formación) ---------- */

function teamNodes(
  lineup: LineupTeam,
  side: "home" | "away",
  horizontal: boolean,
) {
  const xi = lineup.startXI;
  const posRow: Record<string, number> = { G: 1, D: 2, M: 3, F: 4 };
  const rowOf = (p: { grid: string | null; pos: string | null }) =>
    p.grid ? parseInt(p.grid.split(":")[0]) || 1 : (posRow[p.pos ?? ""] ?? 3);
  const colOf = (p: { grid: string | null }) =>
    p.grid ? parseInt(p.grid.split(":")[1]) || 1 : 1;

  const rows = new Map<number, typeof xi>();
  for (const p of xi) {
    const r = rowOf(p);
    const arr = rows.get(r);
    if (arr) arr.push(p);
    else rows.set(r, [p]);
  }
  const rowNums = [...rows.keys()].sort((a, b) => a - b);
  const R = rowNums.length;
  const out: { p: (typeof xi)[number]; x: number; y: number }[] = [];
  rowNums.forEach((r, rIdx) => {
    const players = rows.get(r)!.slice().sort((a, b) => colOf(a) - colOf(b));
    const N = players.length;
    players.forEach((p, cIdx) => {
      const d = R > 1 ? rIdx / (R - 1) : 0; // profundidad: 0 = portero, 1 = ataque
      const w = (cIdx + 1) / (N + 1); // posición dentro de la línea
      let x: number;
      let y: number;
      if (horizontal) {
        // Local a la izquierda, rival a la derecha (ataque hacia el centro).
        if (side === "home") {
          x = 0.05 + d * 0.4;
          y = w;
        } else {
          x = 0.95 - d * 0.4;
          y = 1 - w;
        }
      } else {
        // Local arriba, rival abajo.
        if (side === "home") {
          y = 0.06 + d * 0.36;
          x = w;
        } else {
          y = 0.94 - d * 0.36;
          x = 1 - w;
        }
      }
      out.push({ p, x, y });
    });
  });
  return out;
}

function PitchNode({
  lp,
  pr,
  x,
  y,
  onPick,
}: {
  lp: { id: number; number: number | null; name: string };
  pr: PlayerRating | undefined;
  x: number;
  y: number;
  onPick: (id: number) => void;
}) {
  const rating = pr?.rating ?? null;
  const mark = playerMark(pr);
  const tappable = !!pr;
  return (
    <button
      className="pnode"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, cursor: tappable ? "pointer" : "default" }}
      onClick={() => tappable && onPick(lp.id)}
      disabled={!tappable}
    >
      <span className="pava">
        {pr?.photo ? (
          <Image src={pr.photo} alt="" width={42} height={42} unoptimized />
        ) : (
          <span className="ph">{lp.number ?? ""}</span>
        )}
        {rating != null && (
          <span className="prbadge" style={{ background: ratingColor(rating) }}>
            {rating.toFixed(1)}
          </span>
        )}
        {mark && <span className="pmk">{mark}</span>}
      </span>
      <span className="pname">
        {lp.number ? `${lp.number} ` : ""}
        {shortName(lp.name)}
        {pr?.captain ? " Ⓒ" : ""}
      </span>
    </button>
  );
}

function TeamCaption({ team, formation, align }: { team: Team; formation: string | null; align: "left" | "right" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        margin: "0 0 8px",
      }}
    >
      <Image src={team.logo} alt="" width={20} height={20} unoptimized />
      <b>{team.name}</b>
      {formation ? (
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>{formation}</span>
      ) : null}
    </div>
  );
}

function SubsRow({
  team,
  subs,
  byId,
  onPick,
}: {
  team: Team;
  subs: { id: number; number: number | null; name: string }[];
  byId: Map<number, PlayerRating>;
  onPick: (id: number) => void;
}) {
  const played = subs
    .map((s) => byId.get(s.id))
    .filter((p): p is PlayerRating => !!p)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (played.length === 0) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <p className="mono" style={{ color: "var(--text-dim)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
        {team.name} · suplentes que jugaron
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {played.map((p) => (
          <button key={p.id} className="subschip" type="button" onClick={() => onPick(p.id)}>
            <Avatar photo={p.photo} n={p.number} size={20} />
            <span>{shortName(p.name)}</span>
            <b className="tabular-nums" style={{ color: ratingColor(p.rating ?? 0) }}>
              {p.rating?.toFixed(1)}
            </b>
          </button>
        ))}
      </div>
    </div>
  );
}

function PitchView({
  home,
  away,
  homeLineup,
  awayLineup,
  byId,
  onPick,
  horizontal,
}: {
  home: Team;
  away: Team;
  homeLineup: LineupTeam;
  awayLineup: LineupTeam;
  byId: Map<number, PlayerRating>;
  onPick: (id: number) => void;
  horizontal: boolean;
}) {
  const homeNodes = teamNodes(homeLineup, "home", horizontal);
  const awayNodes = teamNodes(awayLineup, "away", horizontal);
  return (
    <div>
      {horizontal ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <TeamCaption team={home} formation={homeLineup.formation} align="left" />
          <TeamCaption team={away} formation={awayLineup.formation} align="right" />
        </div>
      ) : (
        <TeamCaption team={home} formation={homeLineup.formation} align="left" />
      )}
      <div
        className="pitch"
        style={{
          aspectRatio: horizontal ? "16 / 10" : "10 / 15",
          maxWidth: horizontal ? 760 : 460,
        }}
      >
        {horizontal ? <div className="pitch-midv" /> : <div className="pitch-mid" />}
        <div className="pitch-circle" />
        {horizontal ? (
          <>
            <div className="pitch-box l" />
            <div className="pitch-box r" />
          </>
        ) : (
          <>
            <div className="pitch-box t" />
            <div className="pitch-box b" />
          </>
        )}
        {homeNodes.map((n) => (
          <PitchNode key={n.p.id} lp={n.p} pr={byId.get(n.p.id)} x={n.x} y={n.y} onPick={onPick} />
        ))}
        {awayNodes.map((n) => (
          <PitchNode key={n.p.id} lp={n.p} pr={byId.get(n.p.id)} x={n.x} y={n.y} onPick={onPick} />
        ))}
      </div>
      {!horizontal && (
        <div style={{ marginTop: 8 }}>
          <TeamCaption team={away} formation={awayLineup.formation} align="right" />
        </div>
      )}
      <SubsRow team={home} subs={homeLineup.substitutes} byId={byId} onPick={onPick} />
      <SubsRow team={away} subs={awayLineup.substitutes} byId={byId} onPick={onPick} />
    </div>
  );
}

/* ---------- Vista LISTA ---------- */

function ListView({
  home,
  away,
  homePlayers,
  awayPlayers,
  onPickIndex,
  offsetAway,
}: {
  home: Team;
  away: Team;
  homePlayers: PlayerRating[];
  awayPlayers: PlayerRating[];
  onPickIndex: (i: number) => void;
  offsetAway: number;
}) {
  return (
    <div className="grid2" style={{ alignItems: "start" }}>
      {[
        { team: home, players: homePlayers, offset: 0 },
        { team: away, players: awayPlayers, offset: offsetAway },
      ].map(({ team, players, offset }) => (
        <div key={team.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Image src={team.logo} alt="" width={22} height={22} unoptimized />
            <b>{team.name}</b>
          </div>
          <div className="panel" style={{ overflow: "hidden" }}>
            {players.map((p, i) => (
              <button key={p.id} type="button" onClick={() => onPickIndex(offset + i)} className="prowbtn">
                <Avatar photo={p.photo} n={p.number} size={28} />
                <span className="mono" style={{ width: 30, fontSize: "0.62rem", color: "var(--text-dim)" }}>
                  {p.position ? (POS_ES[p.position] ?? p.position) : ""}
                </span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>
                  {p.name}
                  {p.captain ? <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}> (C)</span> : null}
                  {p.goals > 0 ? <span> {"⚽".repeat(p.goals)}</span> : null}
                  {p.assists > 0 ? <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}> · {p.assists}A</span> : null}
                </span>
                <RatingBadge rating={p.rating} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Componente principal ---------- */

export default function PlayerRatings({
  home,
  away,
  homePlayers,
  awayPlayers,
  homeLineup,
  awayLineup,
}: {
  home: Team;
  away: Team;
  homePlayers: PlayerRating[];
  awayPlayers: PlayerRating[];
  homeLineup: LineupTeam | null;
  awayLineup: LineupTeam | null;
}) {
  const entries: Entry[] = [
    ...homePlayers.map((p) => ({ p, team: home })),
    ...awayPlayers.map((p) => ({ p, team: away })),
  ];
  const byId = new Map<number, PlayerRating>();
  for (const p of [...homePlayers, ...awayPlayers]) byId.set(p.id, p);
  const indexById = new Map<number, number>();
  entries.forEach((e, i) => indexById.set(e.p.id, i));
  const maxRating = Math.max(...entries.map((e) => e.p.rating ?? 0));
  const maxShots = Math.max(...entries.map((e) => e.p.stats.shotsTotal ?? 0));

  const canPitch = !!(homeLineup?.startXI.length && awayLineup?.startXI.length);
  const [view, setView] = useState<"campo" | "lista">(canPitch ? "campo" : "lista");
  const [open, setOpen] = useState<number | null>(null);
  // Campo horizontal en escritorio, vertical en móvil. Arranca vertical (= SSR)
  // y se ajusta al montar para no romper la hidratación.
  const [horizontal, setHorizontal] = useState(false);
  const pickById = (id: number) => {
    const i = indexById.get(id);
    if (i != null) setOpen(i);
  };

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 820px)");
    const apply = () => setHorizontal(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (open == null) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(null);
      if (ev.key === "ArrowLeft") setOpen((i) => (i! > 0 ? i! - 1 : i));
      if (ev.key === "ArrowRight") setOpen((i) => (i! < entries.length - 1 ? i! + 1 : i));
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
        {canPitch ? (
          <div className="tabs" style={{ maxWidth: 200 }}>
            <button type="button" className={view === "campo" ? "on" : ""} onClick={() => setView("campo")}>
              Campo
            </button>
            <button type="button" className={view === "lista" ? "on" : ""} onClick={() => setView("lista")}>
              Lista
            </button>
          </div>
        ) : (
          <span className="sh-note">toca un jugador para ver su detalle</span>
        )}
      </div>

      {view === "campo" && canPitch ? (
        <PitchView
          home={home}
          away={away}
          homeLineup={homeLineup!}
          awayLineup={awayLineup!}
          byId={byId}
          onPick={pickById}
          horizontal={horizontal}
        />
      ) : (
        <ListView
          home={home}
          away={away}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onPickIndex={setOpen}
          offsetAway={homePlayers.length}
        />
      )}

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
        <div className="pmodal-head">
          <button type="button" className="pmodal-nav" onClick={onPrev} disabled={!hasPrev} aria-label="Anterior">
            ‹
          </button>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar photo={p.photo} n={p.number} size={76} />
            <span style={{ position: "absolute", top: -6, right: -10 }}>
              <RatingBadge rating={p.rating} big />
            </span>
            {team.logo ? (
              <Image
                src={team.logo}
                alt=""
                width={24}
                height={24}
                unoptimized
                style={{ position: "absolute", bottom: -2, right: -6, borderRadius: "50%", background: "var(--surface)", padding: 1 }}
              />
            ) : null}
          </div>
          <button type="button" className="pmodal-nav" onClick={onNext} disabled={!hasNext} aria-label="Siguiente">
            ›
          </button>
        </div>

        <h3 style={{ textAlign: "center", margin: "8px 0 16px", fontSize: "1.2rem", fontWeight: 800 }}>{p.name}</h3>

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
