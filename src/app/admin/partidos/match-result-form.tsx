"use client";

import { useActionState } from "react";
import { venueShortName, venueTimezone } from "@/lib/quiniela/venues";
import { saveMatchResult, type SaveResultState } from "./actions";

const initial: SaveResultState = { status: "idle" };

export type AdminMatchData = {
  id: number;
  phaseLabel: string;
  groupLetter: string | null;
  kickoffAt: string;
  venue: string | null;
  homeName: string;
  awayName: string;
  scoreHome: number | null;
  scoreAway: number | null;
  finished: boolean;
};

const FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function MatchResultForm({
  match,
}: {
  match: AdminMatchData;
}) {
  const [state, action, pending] = useActionState(saveMatchResult, initial);
  const justSaved =
    state.status === "success" && state.matchId === match.id ? true : false;

  return (
    <form
      action={action}
      className={`rounded-xl border p-3 transition ${
        match.finished
          ? "border-emerald-900/40 bg-emerald-950/10"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <input type="hidden" name="match_id" value={match.id} />

      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest text-zinc-500">
        <span className="font-mono text-zinc-400">#{match.id}</span>
        <span aria-hidden>·</span>
        <span>{match.phaseLabel}</span>
        {match.groupLetter && (
          <>
            <span aria-hidden>·</span>
            <span>Grupo {match.groupLetter}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <time dateTime={match.kickoffAt}>
          {FMT.format(new Date(match.kickoffAt))}
        </time>
        {(() => {
          const tz = venueTimezone(match.venue);
          if (!tz || !match.venue) return null;
          const venueTime = new Intl.DateTimeFormat("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: tz,
          }).format(new Date(match.kickoffAt));
          return (
            <>
              <span aria-hidden>·</span>
              <span className="normal-case tracking-normal text-zinc-500">
                {venueShortName(match.venue)} {venueTime}
              </span>
            </>
          );
        })()}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="truncate text-right text-sm font-medium">
          {match.homeName}
        </span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            name="score_home"
            defaultValue={match.scoreHome ?? ""}
            min={0}
            max={99}
            disabled={pending}
            className="h-10 w-12 rounded-lg border border-zinc-800 bg-zinc-900 text-center text-base font-semibold tabular-nums focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="number"
            name="score_away"
            defaultValue={match.scoreAway ?? ""}
            min={0}
            max={99}
            disabled={pending}
            className="h-10 w-12 rounded-lg border border-zinc-800 bg-zinc-900 text-center text-base font-semibold tabular-nums focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60"
          />
        </div>
        <span className="truncate text-left text-sm font-medium">
          {match.awayName}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            name="finished"
            defaultChecked={match.finished}
            disabled={pending}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-indigo-300"
          />
          <span>
            Finalizado
            {match.finished && (
              <span className="ml-1 text-emerald-400">✓</span>
            )}
          </span>
        </label>

        <div className="flex items-center gap-2">
          {justSaved && (
            <span className="text-xs text-emerald-400">✓ Guardado</span>
          )}
          {state.status === "error" && (
            <span className="text-xs text-red-300">⚠ {state.message}</span>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:border-indigo-300 disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
