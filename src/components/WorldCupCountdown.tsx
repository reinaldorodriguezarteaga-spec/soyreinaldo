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

function pad(n: number, width = 2) {
  return n.toString().padStart(width, "0");
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-white sm:text-7xl"
        suppressHydrationWarning
      >
        {pad(value)}
      </span>
      <span className="mt-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export default function WorldCupCountdown() {
  // Initialize with a deterministic snapshot computed once at module load
  // on the server. After hydration, useEffect kicks in and we update each
  // second on the client.
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
    <section className="mt-10 sm:mt-14" aria-label="Cuenta atrás Mundial 2026">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-zinc-950 to-zinc-950 p-6 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-300 sm:text-sm">
            Mundial 2026 · Primer pitido en
          </p>
          <div className="mt-6 grid grid-cols-4 gap-2 sm:mt-8 sm:gap-6">
            <Cell value={remaining.days} label="días" />
            <Cell value={remaining.hours} label="horas" />
            <Cell value={remaining.minutes} label="min" />
            <Cell value={remaining.seconds} label="seg" />
          </div>
          <p className="mt-6 text-center text-xs text-zinc-500 sm:mt-8 sm:text-sm">
            México vs Sudáfrica · 11 jun · 21:00 (Madrid)
          </p>
        </div>
      </div>
    </section>
  );
}
