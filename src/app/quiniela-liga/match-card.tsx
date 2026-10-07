"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { savePrediction } from "./actions";
import type { FormaEquipo } from "@/lib/quiniela-liga/forma";
import { ANFITRION_NOMBRE, type PronosticoAnfitrion } from "@/lib/quiniela-liga/anfitrion";

export type ClubTeam = {
  id: number;
  name: string;
  logo: string | null;
  /** Puesto, DG y último resultado (solo en partidos por jugar). */
  forma?: FormaEquipo | null;
};

export type LqMatchCardData = {
  id: number;
  kickoffAt: string;
  /** Etiqueta de competición + jornada, p. ej. "LaLiga · J1". */
  compLabel: string;
  home: ClubTeam;
  away: ClubTeam;
  prediction: { home: number; away: number } | null;
  /** kickoff a <30 min → la RLS bloquea la escritura. */
  locked: boolean;
  live: {
    scoreHome: number | null;
    scoreAway: number | null;
    finished: boolean;
    status: string | null;
    minute: number | null;
  };
  /** Puntos de este usuario en este partido (null si no jugado / sin pronóstico). */
  points: number | null;
  /** Pronóstico de Reinaldo ("¿Le ganas a Reinaldo?"); null para él mismo. */
  anfitrion?: PronosticoAnfitrion | null;
};

const LIVE_STATES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const FINAL_STATES = new Set(["FT", "AET", "PEN"]);

const DAY_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});
const TIME_FMT = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function formatKickoff(iso: string) {
  const d = new Date(iso);
  const day = DAY_FMT.format(d)
    .replace(",", "")
    .replace(/^./, (c) => c.toUpperCase());
  return { day, time: TIME_FMT.format(d) };
}

export default function LqMatchCard({
  match,
  maxPuntos,
}: {
  match: LqMatchCardData;
  /** Puntos del marcador exacto en esta liga: decide qué acierto se pinta
   * como pleno (verde) y cuál como acierto simple. */
  maxPuntos: number;
}) {
  const [home, setHome] = useState(String(match.prediction?.home ?? ""));
  const [away, setAway] = useState(String(match.prediction?.away ?? ""));
  const [savedHome, setSavedHome] = useState(String(match.prediction?.home ?? ""));
  const [savedAway, setSavedAway] = useState(String(match.prediction?.away ?? ""));
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "locked"
  >("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const liveStatus = match.live.status;
  const isLive = liveStatus != null && LIVE_STATES.has(liveStatus);
  const isFinal =
    match.live.finished || (liveStatus != null && FINAL_STATES.has(liveStatus));
  const hasScore =
    (isLive || isFinal) &&
    match.live.scoreHome != null &&
    match.live.scoreAway != null;
  const showScoreBlock = hasScore;
  const inputsDisabled = match.locked || status === "saving";

  function tryAutoSave(nextHome: string, nextAway: string) {
    if (match.locked) return;
    if (nextHome === "" || nextAway === "") return;
    if (nextHome === savedHome && nextAway === savedAway) return;
    const h = parseInt(nextHome, 10);
    const a = parseInt(nextAway, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;

    setStatus("saving");
    setErrMsg(null);
    startTransition(async () => {
      const res = await savePrediction(match.id, h, a);
      if (res.ok) {
        setSavedHome(nextHome);
        setSavedAway(nextAway);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1400);
      } else if (res.reason === "locked") {
        setStatus("locked");
      } else {
        setStatus("error");
        setErrMsg(res.message);
      }
    });
  }

  const { day, time } = formatKickoff(match.kickoffAt);

  return (
    <article
      id={`lqmatch-${match.id}`}
      className={`gamecard scroll-mt-24${match.locked ? " locked" : ""}`}
    >
      <header className="gamecard__head">
        <div className="gamecard__when">
          <div>
            <b>{day}</b>
            <span className="t">{time}</span>
          </div>
          <p className="gamecard__venue">{match.compLabel}</p>
        </div>
        {isLive && (
          <span className="badge badge--danger">
            <span className="livepulse" />
            {liveStatus === "HT"
              ? "Descanso"
              : match.live.minute != null
                ? `${match.live.minute}'`
                : "EN VIVO"}
          </span>
        )}
        {isFinal && !isLive && <span className="badge">Final</span>}
      </header>

      <div>
        <TeamRow team={match.home}>
          {showScoreBlock ? (
            <ScoreDisplay value={match.live.scoreHome ?? 0} live={isLive} />
          ) : (
            <ScoreInput
              value={home}
              onChange={(v) => {
                setHome(v);
                tryAutoSave(v, away);
              }}
              disabled={inputsDisabled}
              label={`Goles ${match.home.name}`}
            />
          )}
        </TeamRow>
        <TeamRow team={match.away}>
          {showScoreBlock ? (
            <ScoreDisplay value={match.live.scoreAway ?? 0} live={isLive} />
          ) : (
            <ScoreInput
              value={away}
              onChange={(v) => {
                setAway(v);
                tryAutoSave(home, v);
              }}
              disabled={inputsDisabled}
              label={`Goles ${match.away.name}`}
            />
          )}
        </TeamRow>
      </div>

      {showScoreBlock && match.prediction && (
        <div className="predbar">
          <span>
            Tu pronóstico:{" "}
            <b>
              {match.prediction.home}–{match.prediction.away}
            </b>
          </span>
          {isFinal && match.points != null && (
            <span
              className={`badge ${
                match.points === maxPuntos
                  ? "badge--ok"
                  : match.points > 0
                    ? "badge--accent"
                    : ""
              }`}
            >
              {match.points > 0 ? `+${match.points}` : match.points} pts
            </span>
          )}
        </div>
      )}
      {showScoreBlock && !match.prediction && isFinal && (
        <p className="predbar" style={{ justifyContent: "center" }}>
          No pronosticaste este partido.
        </p>
      )}

      {match.anfitrion && <LineaAnfitrion p={match.anfitrion} />}

      <footer className="gamecard__foot">
        {match.locked && !showScoreBlock && <span>🔒 Cerrado · falta &lt;30min</span>}
        {!match.locked && status === "saving" && <span>Guardando…</span>}
        {!match.locked && status === "saved" && (
          <span style={{ color: "var(--accent)" }}>✓ Guardado</span>
        )}
        {!match.locked && status === "locked" && <span>🔒 Justo se bloqueó</span>}
        {!match.locked && status === "error" && errMsg && (
          <span style={{ color: "#ffb4b4" }}>⚠ {errMsg}</span>
        )}
      </footer>
    </article>
  );
}

function TeamRow({
  team,
  children,
}: {
  team: ClubTeam;
  children: React.ReactNode;
}) {
  return (
    <div className="gamerow">
      <div className="gamerow__team">
        <span className="gamerow__flag" style={{ display: "grid", placeItems: "center" }}>
          {team.logo ? (
            <Image src={team.logo} alt="" width={22} height={22} unoptimized />
          ) : (
            "⚽"
          )}
        </span>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span className="gamerow__name" title={team.name}>
            {team.name}
          </span>
          {team.forma && <LineaForma forma={team.forma} />}
        </span>
      </div>
      {children}
    </div>
  );
}

/** "🎙️ Reinaldo: 2–1", o solo si ya pronosticó (el marcador, desde el
 * pitido inicial, como el de cualquiera). */
function LineaAnfitrion({ p }: { p: PronosticoAnfitrion }) {
  return (
    <p
      style={{
        margin: "8px 0 0",
        textAlign: "center",
        fontSize: "0.82rem",
        color: "var(--text-dim)",
      }}
    >
      🎙️{" "}
      {p.home != null && p.away != null ? (
        <>
          {ANFITRION_NOMBRE} dijo{" "}
          <b style={{ color: "var(--text)" }}>
            {p.home}–{p.away}
          </b>
        </>
      ) : p.hecho ? (
        <>{ANFITRION_NOMBRE} ya ha pronosticado. ¿Le ganas?</>
      ) : (
        <>{ANFITRION_NOMBRE} aún no ha pronosticado</>
      )}
    </p>
  );
}

const COLOR_RESULTADO = { V: "#22c55e", E: "#9aa4d6", D: "#ef4444" } as const;
const TITULO_RESULTADO = { V: "Ganó", E: "Empató", D: "Perdió" } as const;

/** "3º · DG +12 · V": lo justo para decidir sin salir de la quiniela. */
function LineaForma({ forma }: { forma: FormaEquipo }) {
  const partes: React.ReactNode[] = [];
  if (forma.puesto != null) partes.push(<span key="p">{forma.puesto}º</span>);
  if (forma.dg != null) {
    partes.push(
      <span key="d" title="Diferencia de goles">
        DG {forma.dg > 0 ? `+${forma.dg}` : forma.dg}
      </span>,
    );
  }
  if (forma.ultimo) {
    partes.push(
      <span
        key="u"
        title={`Último partido: ${TITULO_RESULTADO[forma.ultimo]}`}
        aria-label={`Último partido: ${TITULO_RESULTADO[forma.ultimo]}`}
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 16,
          height: 16,
          borderRadius: 4,
          fontSize: "0.6rem",
          fontWeight: 700,
          color: "#fff",
          background: COLOR_RESULTADO[forma.ultimo],
        }}
      >
        {forma.ultimo}
      </span>,
    );
  }
  if (partes.length === 0) return null;
  return (
    <span
      className="mono"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "var(--text-dim)",
        fontSize: "0.66rem",
        marginTop: 2,
      }}
    >
      {partes.flatMap((x, i) => (i === 0 ? [x] : [<span key={`s${i}`} aria-hidden>·</span>, x]))}
    </span>
  );
}

function ScoreDisplay({ value, live }: { value: number; live: boolean }) {
  return <span className={`scoreout${live ? " live" : ""}`}>{value}</span>;
}

function ScoreInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min={0}
      max={99}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
      disabled={disabled}
      aria-label={label}
      className="scorein"
    />
  );
}
