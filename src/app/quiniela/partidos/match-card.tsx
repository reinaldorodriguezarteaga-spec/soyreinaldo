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
};

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
      className={`scroll-mt-24 rounded-2xl border p-4 transition ${
        isLocked
          ? "border-zinc-800 bg-zinc-950/60 opacity-80"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      <header className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-tight text-white">
            {day}
          </span>
          <span className="text-sm font-medium tabular-nums text-indigo-300">
            {time}
          </span>
        </div>
        {venueLine && (
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            {venueLine}
          </p>
        )}
      </header>

      <div className="space-y-2">
        <TeamRow team={match.home} label={homeLabel}>
          <ScoreInput
            value={home}
            onChange={(v) => {
              setHome(v);
              tryAutoSave(v, away);
            }}
            disabled={inputsDisabled}
            label={`Goles ${homeLabel}`}
          />
        </TeamRow>
        <TeamRow team={match.away} label={awayLabel}>
          <ScoreInput
            value={away}
            onChange={(v) => {
              setAway(v);
              tryAutoSave(home, v);
            }}
            disabled={inputsDisabled}
            label={`Goles ${awayLabel}`}
          />
        </TeamRow>
      </div>

      <footer className="mt-3 min-h-[1rem] text-right text-[11px]">
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
              Equipos por definir tras la fase anterior
            </span>
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
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xl leading-none">
          {isPlaceholder ? "🏟️" : team.flag}
        </span>
        <span
          className={`truncate text-sm font-medium ${
            isPlaceholder ? "text-zinc-500" : "text-white"
          }`}
          title={label}
        >
          {label}
        </span>
      </div>
      {children}
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
      className="h-10 w-10 rounded-lg border border-zinc-800 bg-zinc-900 text-center text-base font-semibold tabular-nums text-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
