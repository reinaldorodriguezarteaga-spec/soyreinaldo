"use client";

import { useEffect, useState } from "react";
import { WORLD_CUP } from "@/lib/sports/api-football";

const KICKOFF_MS = new Date(WORLD_CUP.startUtc).getTime();

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function diff(now: number): Remaining | null {
  const ms = KICKOFF_MS - now;
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Banda compacta debajo del header con el countdown al pitido inicial.
 * Pensada para ir DENTRO del bloque sticky del header → acompaña el scroll
 * sin volar por su cuenta.
 *
 * Se oculta automáticamente una vez empieza el Mundial.
 */
export default function WorldCupCountdownBar() {
  const [remaining, setRemaining] = useState<Remaining | null>(() =>
    diff(Date.now()),
  );

  useEffect(() => {
    setRemaining(diff(Date.now()));
    const id = setInterval(() => setRemaining(diff(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  if (!remaining) return null;

  return (
    <div className="border-b border-zinc-900 bg-gradient-to-r from-indigo-500/15 via-zinc-950 to-zinc-950">
      <div className="mx-auto flex items-center justify-center gap-4 px-4 py-3 sm:gap-5">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300 sm:text-sm">
          Mundial 2026
        </span>
        <span className="font-mono text-sm tabular-nums text-zinc-200 sm:text-base">
          <Cell n={remaining.days} l="d" />
          <Sep />
          <Cell n={remaining.hours} l="h" />
          <Sep />
          <Cell n={remaining.minutes} l="m" />
          <Sep />
          <Cell n={remaining.seconds} l="s" suppress />
        </span>
      </div>
    </div>
  );
}

function Cell({ n, l, suppress }: { n: number; l: string; suppress?: boolean }) {
  return (
    <span suppressHydrationWarning={suppress}>
      <span className="font-semibold">{pad(n)}</span>
      <span className="ml-0.5 text-zinc-500">{l}</span>
    </span>
  );
}

function Sep() {
  return <span className="mx-1.5 text-zinc-700">·</span>;
}
