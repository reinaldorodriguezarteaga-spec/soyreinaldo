import Image from "next/image";
import Link from "next/link";
import {
  getLaligaStandings,
  getLaligaUpcomingFixtures,
  isFinal,
  isLive,
  type Fixture,
  type StandingRow,
} from "@/lib/sports/api-football";

export const metadata = {
  title: "LaLiga | Soy Reinaldo",
  description:
    "Clasificación completa de LaLiga y próximos partidos de Primera División.",
};

const HIGHLIGHT_TEAMS = new Set([529, 541]); // Barça, Madrid
const MADRID_TZ = "Europe/Madrid";

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function FormDot({ result }: { result: string }) {
  if (result === "W") {
    return (
      <span
        title="Victoria"
        className="inline-block h-2 w-2 rounded-full bg-emerald-400"
      />
    );
  }
  if (result === "L") {
    return (
      <span
        title="Derrota"
        className="inline-block h-2 w-2 rounded-full bg-red-400"
      />
    );
  }
  return (
    <span
      title="Empate"
      className="inline-block h-2 w-2 rounded-full bg-zinc-600"
    />
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-600">
        {label}
      </span>
      <span className="font-mono text-xs font-medium tabular-nums text-zinc-300">
        {value}
      </span>
    </span>
  );
}

function StandingsRow({ r }: { r: StandingRow }) {
  const highlight = HIGHLIGHT_TEAMS.has(r.team.id);
  const form = (r.form ?? "").slice(-5).split("");
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${
        highlight
          ? "border-indigo-400/30 bg-indigo-500/5"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-6 shrink-0 text-center font-mono text-sm font-semibold tabular-nums ${
            highlight ? "text-indigo-200" : "text-zinc-500"
          }`}
        >
          {r.rank}
        </span>
        <Image
          src={r.team.logo}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 shrink-0 object-contain"
          unoptimized
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
          {r.team.name}
        </span>
        <span className="shrink-0 font-mono text-base font-semibold tabular-nums text-white">
          {r.points}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-9 sm:gap-x-4">
        <Stat label="PJ" value={r.all.played} />
        <span className="text-zinc-800">·</span>
        <Stat label="G" value={r.all.win} />
        <Stat label="E" value={r.all.draw} />
        <Stat label="P" value={r.all.lose} />
        <span className="text-zinc-800">·</span>
        <Stat label="GF" value={r.all.goals.for} />
        <Stat label="GC" value={r.all.goals.against} />
        <Stat label="DG" value={r.goalsDiff > 0 ? `+${r.goalsDiff}` : r.goalsDiff} />
        {form.length > 0 && (
          <>
            <span className="text-zinc-800">·</span>
            <span className="inline-flex items-center gap-1">
              {form.map((c, i) => (
                <FormDot key={i} result={c} />
              ))}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function FixtureCard({ fx }: { fx: Fixture }) {
  const showScore = isLive(fx) || isFinal(fx);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{formatKickoff(fx.fixture.date)}</span>
        {isLive(fx) && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            {fx.fixture.status.short === "HT"
              ? "Descanso"
              : fx.fixture.status.elapsed != null
                ? `${fx.fixture.status.elapsed}'`
                : "EN VIVO"}
          </span>
        )}
        {isFinal(fx) && (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
            Final
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Image
            src={fx.teams.home.logo}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] shrink-0 object-contain"
            unoptimized
          />
          <span className="truncate text-sm text-zinc-200">
            {fx.teams.home.name}
          </span>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-white">
          {showScore ? `${fx.goals.home ?? 0}–${fx.goals.away ?? 0}` : "vs"}
        </span>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2 text-right">
          <Image
            src={fx.teams.away.logo}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] shrink-0 object-contain"
            unoptimized
          />
          <span className="truncate text-sm text-zinc-200">
            {fx.teams.away.name}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function LaligaPage() {
  let standings: StandingRow[] = [];
  let fixtures: Fixture[] = [];
  try {
    [standings, fixtures] = await Promise.all([
      getLaligaStandings(),
      getLaligaUpcomingFixtures(10),
    ]);
  } catch {
    // si la API falla, renderizamos un estado vacío más abajo
  }

  const round = fixtures[0]?.league.round ?? null;

  return (
    <main className="flex flex-1 flex-col px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Primera División · Temporada 2025-26
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            La<span className="text-indigo-300">Liga</span>.
          </h1>
        </header>

        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Clasificación</h2>
            {standings.length > 0 && (
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                Jornada {standings[0]?.all.played}
              </span>
            )}
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
            <span className="text-zinc-400">PJ</span> partidos jugados ·{" "}
            <span className="text-zinc-400">G/E/P</span> ganados, empatados,
            perdidos · <span className="text-zinc-400">GF/GC</span> goles a
            favor y en contra · <span className="text-zinc-400">DG</span>{" "}
            diferencia · últimos 5{" "}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />{" "}
            victoria{" "}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-600 align-middle" />{" "}
            empate{" "}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 align-middle" />{" "}
            derrota
          </p>
          {standings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center text-sm text-zinc-500">
              Sin datos disponibles ahora mismo.
            </div>
          ) : (
            <div className="space-y-2">
              {standings.map((r) => (
                <StandingsRow key={r.team.id} r={r} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Próxima jornada</h2>
            {round && (
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                {round}
              </span>
            )}
          </div>
          {fixtures.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center text-sm text-zinc-500">
              Sin partidos próximos en el calendario.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {fixtures.map((fx) => (
                <FixtureCard key={fx.fixture.id} fx={fx} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
