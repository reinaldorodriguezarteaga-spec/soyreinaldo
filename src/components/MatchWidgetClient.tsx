"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { isFinal, isLive, type Fixture } from "@/lib/sports/api-football";
import type { WidgetData } from "@/lib/sports/widget-data";

const MADRID_TZ = "Europe/Madrid";
const POLL_MS = 30_000;

function formatKickoffMadrid(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StatusBadge({ fx }: { fx: Fixture }) {
  if (isLive(fx)) {
    const min = fx.fixture.status.elapsed;
    const label =
      fx.fixture.status.short === "HT"
        ? "Descanso"
        : min != null
          ? `${min}'`
          : "EN VIVO";
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        {label}
      </span>
    );
  }
  if (isFinal(fx)) {
    return (
      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
        Final
      </span>
    );
  }
  return (
    <span className="text-[11px] text-zinc-500">
      {formatKickoffMadrid(fx.fixture.date)}
    </span>
  );
}

function ScoreOrVs({ fx }: { fx: Fixture }) {
  if (isLive(fx) || isFinal(fx)) {
    return (
      <span className="font-mono text-lg font-semibold tabular-nums text-white">
        {fx.goals.home ?? 0}
        <span className="mx-2 text-zinc-600">–</span>
        {fx.goals.away ?? 0}
      </span>
    );
  }
  return <span className="text-sm font-medium text-zinc-500">vs</span>;
}

function TeamSide({
  name,
  logo,
  align,
}: {
  name: string;
  logo: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2.5 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <Image
        src={logo}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 object-contain"
        unoptimized
      />
      <span className="truncate text-sm font-medium text-zinc-200">{name}</span>
    </div>
  );
}

function FixtureRow({ fx }: { fx: Fixture }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <TeamSide name={fx.teams.home.name} logo={fx.teams.home.logo} align="left" />
      <div className="flex shrink-0 flex-col items-center gap-1">
        <ScoreOrVs fx={fx} />
        <StatusBadge fx={fx} />
      </div>
      <TeamSide
        name={fx.teams.away.name}
        logo={fx.teams.away.logo}
        align="right"
      />
    </div>
  );
}

export default function MatchWidgetClient({ initial }: { initial: WidgetData }) {
  const [data, setData] = useState<WidgetData>(initial);

  useEffect(() => {
    if (!data.needsPolling) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/sports/widget", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: WidgetData = await res.json();
        if (!cancelled) setData(next);
      } catch {
        // El polling es best-effort; un fallo puntual no debe romper la UI.
      }
    }

    timer = setInterval(tick, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [data.needsPolling]);

  if (data.fixtures.length === 0) return null;

  const heading = data.mode === "wc" ? "Mundial 2026 · Hoy" : "Marcador";
  const subtitle =
    data.mode === "wc"
      ? `${data.fixtures.length} ${data.fixtures.length === 1 ? "partido" : "partidos"}`
      : data.needsPolling
        ? "En directo"
        : "Próximos partidos";

  return (
    <section className="mt-12 sm:mt-16" aria-label={heading}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-[0.3em] text-indigo-300">
          {heading}
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-zinc-600">
          {subtitle}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.fixtures.map((fx) => (
          <FixtureRow key={fx.fixture.id} fx={fx} />
        ))}
      </div>
    </section>
  );
}
