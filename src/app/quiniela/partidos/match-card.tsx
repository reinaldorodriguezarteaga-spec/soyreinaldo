"use client";

import { useState, useTransition } from "react";
import { venueShortName, venueTimezone } from "@/lib/quiniela/venues";
import { savePrediction } from "./actions";

export type MatchTeam = {
  code: string;
  name: string;
  flag: string;
  groupLetter: string | null;
};

export type MatchCardData = {
  id: number;
  groupLetter: string | null;
  kickoffAt: string;
  venue: string | null;
  phaseLabel: string;
  /** Either resolved teams or placeholder strings ("2A", "W74", "L101") */
  home: MatchTeam | { placeholder: string };
  away: MatchTeam | { placeholder: string };
  /** Existing prediction if any */
  prediction: { home: number; away: number } | null;
  /** kickoff_at <= now() — RLS will block writes */
  locked: boolean;
  /** Estado en vivo (rellenado por el cron de ingesta) */
  live: {
    scoreHome: number | null;
    scoreAway: number | null;
    finished: boolean;
    status: string | null;
    minute: number | null;
  };
  /** Puntos que sacó este usuario en este partido (null si aún no terminado o sin pronóstico) */
  points: number | null;
};

const LIVE_STATES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const FINAL_STATES = new Set(["FT", "AET", "PEN"]);

const DAY_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

function timeIn(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

function formatKickoff(
  iso: string,
  venue: string | null,
): {
  day: string;
  time: string;
  venueLine: string | null;
} {
  const d = new Date(iso);
  const day = DAY_FMT.format(d)
    .replace(",", "")
    .replace(/^./, (c) => c.toUpperCase());
  const time = TIME_FMT.format(d);

  const tz = venueTimezone(venue);
  const venueLine = tz
    ? `${venueShortName(venue)} · ${timeIn(iso, tz)} local`
    : venue
      ? venueShortName(venue)
      : null;

  return { day, time, venueLine };
}

export default function MatchCard({ match }: { match: MatchCardData }) {
  const initialHome = match.prediction?.home ?? "";
  const initialAway = match.prediction?.away ?? "";
  const [home, setHome] = useState<string>(String(initialHome));
  const [away, setAway] = useState<string>(String(initialAway));
  const [savedHome, setSavedHome] = useState<string>(String(initialHome));
  const [savedAway, setSavedAway] = useState<string>(String(initialAway));
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "locked"
  >("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isLocked = match.locked;
  const homeLabel =
    "placeholder" in match.home ? match.home.placeholder : match.home.name;
  const awayLabel =
    "placeholder" in match.away ? match.away.placeholder : match.away.name;
  const homeIsPlaceholder = "placeholder" in match.home;
  const awayIsPlaceholder = "placeholder" in match.away;
  const inputsDisabled =
    isLocked || homeIsPlaceholder || awayIsPlaceholder || status === "saving";

  const liveStatus = match.live.status;
  const isLive = liveStatus != null && LIVE_STATES.has(liveStatus);
  const isFinal = match.live.finished || (liveStatus != null && FINAL_STATES.has(liveStatus));
  const hasScore =
    (isLive || isFinal) &&
    match.live.scoreHome != null &&
    match.live.scoreAway != null;
  // Cuando hay marcador (live o final), no enseñamos los inputs aunque el
  // usuario tenga pronóstico anterior — en su lugar mostramos el resultado
  // real y abajo la predicción del usuario.
  const showScoreBlock = hasScore;

  function tryAutoSave(nextHome: string, nextAway: string) {
    if (isLocked) return;
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

  const { day, time, venueLine } = formatKickoff(match.kickoffAt, match.venue);

  return (
    <article
      id={`match-${match.id}`}
      className={`gamecard scroll-mt-24${isLocked ? " locked" : ""}`}
    >
      <header className="gamecard__head">
        <div className="gamecard__when">
          <div>
            <b>{day}</b>
            <span className="t">{time}</span>
          </div>
          {venueLine && <p className="gamecard__venue">{venueLine}</p>}
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
        <TeamRow team={match.home} label={homeLabel}>
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
              label={`Goles ${homeLabel}`}
            />
          )}
        </TeamRow>
        <TeamRow team={match.away} label={awayLabel}>
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
              label={`Goles ${awayLabel}`}
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
                match.points === 3
                  ? "badge--ok"
                  : match.points === 1
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

      <footer className="gamecard__foot">
        {isLocked && <span>🔒 Cerrado · falta &lt;30min</span>}
        {!isLocked && status === "saving" && <span>Guardando…</span>}
        {!isLocked && status === "saved" && (
          <span style={{ color: "var(--accent)" }}>✓ Guardado</span>
        )}
        {!isLocked && status === "locked" && <span>🔒 Justo se bloqueó</span>}
        {!isLocked && status === "error" && errMsg && (
          <span style={{ color: "#ffb4b4" }}>⚠ {errMsg}</span>
        )}
        {!isLocked &&
          status === "idle" &&
          (homeIsPlaceholder || awayIsPlaceholder) && (
            <span>Equipos por definir tras la fase anterior</span>
          )}
      </footer>
    </article>
  );
}

function TeamRow({
  team,
  label,
  children,
}: {
  team: MatchTeam | { placeholder: string };
  label: string;
  children: React.ReactNode;
}) {
  const isPlaceholder = "placeholder" in team;
  return (
    <div className="gamerow">
      <div className="gamerow__team">
        <span className="gamerow__flag">
          {isPlaceholder ? "🏟️" : team.flag}
        </span>
        <span
          className={`gamerow__name${isPlaceholder ? " ph" : ""}`}
          title={label}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
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
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
        onChange(v);
      }}
      disabled={disabled}
      aria-label={label}
      className="scorein"
    />
  );
}
