"use client";

import { useState, useTransition } from "react";
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
};

const KICKOFF_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

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

  return (
    <article
      className={`rounded-2xl border p-4 transition sm:p-5 ${
        isLocked
          ? "border-zinc-800 bg-zinc-950/60 opacity-80"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-widest text-zinc-500">
        <span>{match.phaseLabel}</span>
        {match.groupLetter && (
          <>
            <span aria-hidden>·</span>
            <span>Grupo {match.groupLetter}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <time className="tabular-nums" dateTime={match.kickoffAt}>
          {KICKOFF_FMT.format(new Date(match.kickoffAt))}
        </time>
        {match.venue && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{match.venue}</span>
          </>
        )}
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamLabel team={match.home} align="end" />
        <div className="flex items-center gap-2">
          <ScoreInput
            value={home}
            onChange={(v) => {
              setHome(v);
              tryAutoSave(v, away);
            }}
            disabled={inputsDisabled}
            label={`Goles ${homeLabel}`}
          />
          <span className="text-zinc-500">–</span>
          <ScoreInput
            value={away}
            onChange={(v) => {
              setAway(v);
              tryAutoSave(home, v);
            }}
            disabled={inputsDisabled}
            label={`Goles ${awayLabel}`}
          />
        </div>
        <TeamLabel team={match.away} align="start" />
      </div>

      <footer className="mt-3 min-h-5 text-right text-[11px]">
        {isLocked && (
          <span className="text-zinc-500">🔒 Bloqueado · ya empezó</span>
        )}
        {!isLocked && status === "saving" && (
          <span className="text-zinc-400">Guardando…</span>
        )}
        {!isLocked && status === "saved" && (
          <span className="text-emerald-400">✓ Guardado</span>
        )}
        {!isLocked && status === "locked" && (
          <span className="text-zinc-500">🔒 Justo se bloqueó</span>
        )}
        {!isLocked && status === "error" && errMsg && (
          <span className="text-red-300">⚠ {errMsg}</span>
        )}
        {!isLocked &&
          status === "idle" &&
          (homeIsPlaceholder || awayIsPlaceholder) && (
            <span className="text-zinc-500">
              Equipos por definir tras la fase de grupos
            </span>
          )}
      </footer>
    </article>
  );
}

function TeamLabel({
  team,
  align,
}: {
  team: MatchTeam | { placeholder: string };
  align: "start" | "end";
}) {
  const isPlaceholder = "placeholder" in team;
  return (
    <div
      className={`flex items-center gap-2 text-sm sm:text-base ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
    >
      {align === "end" ? (
        <>
          <span
            className={`truncate text-right font-medium ${
              isPlaceholder ? "text-zinc-500" : "text-white"
            }`}
          >
            {isPlaceholder ? team.placeholder : team.name}
          </span>
          <span className="shrink-0 text-2xl leading-none">
            {isPlaceholder ? "🏟️" : team.flag}
          </span>
        </>
      ) : (
        <>
          <span className="shrink-0 text-2xl leading-none">
            {isPlaceholder ? "🏟️" : team.flag}
          </span>
          <span
            className={`truncate font-medium ${
              isPlaceholder ? "text-zinc-500" : "text-white"
            }`}
          >
            {isPlaceholder ? team.placeholder : team.name}
          </span>
        </>
      )}
    </div>
  );
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
      className="h-12 w-12 rounded-lg border border-zinc-800 bg-zinc-900 text-center text-lg font-semibold tabular-nums text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-14 sm:text-xl"
    />
  );
}
