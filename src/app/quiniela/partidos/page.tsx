import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  UI_PHASES,
  findPhaseBySlug,
  labelForKey,
  type PhaseKey,
} from "@/lib/quiniela/phases";
import MatchCard, { type MatchCardData } from "./match-card";

export const metadata = {
  title: "Pronósticos | Quiniela | Soy Reinaldo",
};

type TeamRow = {
  id: string;
  name: string;
  flag_emoji: string | null;
  group_letter: string | null;
};

type MatchRow = {
  id: number;
  phase: PhaseKey;
  group_letter: string | null;
  kickoff_at: string;
  venue: string | null;
  team_home_placeholder: string | null;
  team_away_placeholder: string | null;
  home: TeamRow | null;
  away: TeamRow | null;
};

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const params = await searchParams;
  const phase = findPhaseBySlug(params.fase);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/quiniela/partidos");
  }

  // Cargar partidos de la fase seleccionada (puede englobar varias claves DB)
  const { data: matchesData } = await supabase
    .from("matches")
    .select(
      `
      id, phase, group_letter, kickoff_at, venue,
      team_home_placeholder, team_away_placeholder,
      home:team_home(id, name, flag_emoji, group_letter),
      away:team_away(id, name, flag_emoji, group_letter)
    `,
    )
    .in("phase", phase.keys)
    .order("kickoff_at", { ascending: true })
    .returns<MatchRow[]>();

  const matches = matchesData ?? [];

  // Cargar predicciones del usuario para esos partidos
  const matchIds = matches.map((m) => m.id);
  const { data: predictionsData } = await supabase
    .from("predictions")
    .select("match_id, score_home, score_away")
    .eq("user_id", user.id)
    .in("match_id", matchIds);

  const predictionByMatch = new Map<
    number,
    { home: number; away: number }
  >();
  for (const p of predictionsData ?? []) {
    predictionByMatch.set(p.match_id, { home: p.score_home, away: p.score_away });
  }

  // Progreso global (todas las fases)
  const { count: totalPredictions } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  const { count: totalMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  const now = new Date();

  const cards: MatchCardData[] = matches.map((m) => {
    const kickoff = new Date(m.kickoff_at);
    const locked = kickoff <= now;
    const home: MatchCardData["home"] = m.home
      ? {
          code: m.home.id,
          name: m.home.name,
          flag: m.home.flag_emoji ?? "",
          groupLetter: m.home.group_letter,
        }
      : { placeholder: m.team_home_placeholder ?? "TBD" };
    const away: MatchCardData["away"] = m.away
      ? {
          code: m.away.id,
          name: m.away.name,
          flag: m.away.flag_emoji ?? "",
          groupLetter: m.away.group_letter,
        }
      : { placeholder: m.team_away_placeholder ?? "TBD" };
    return {
      id: m.id,
      groupLetter: m.group_letter,
      kickoffAt: m.kickoff_at,
      venue: m.venue,
      phaseLabel: labelForKey(m.phase),
      home,
      away,
      prediction: predictionByMatch.get(m.id) ?? null,
      locked,
    };
  });

  const isGroupStage = phase.keys.some((k) => k.startsWith("group_"));

  // Para fase de grupos agrupamos por letra de grupo (A..L)
  const cardsByGroup: Map<string, MatchCardData[]> = new Map();
  if (isGroupStage) {
    for (const c of cards) {
      const key = c.groupLetter ?? "?";
      if (!cardsByGroup.has(key)) cardsByGroup.set(key, []);
      cardsByGroup.get(key)!.push(c);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver a la quiniela
        </Link>

        <header className="mt-6 mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
              Pronósticos · Mundial 2026
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {phase.label}
            </h1>
          </div>
          <div className="text-sm text-zinc-400 tabular-nums">
            <span className="font-semibold text-indigo-300">
              {totalPredictions ?? 0}
            </span>
            <span className="text-zinc-500"> / {totalMatches ?? 104}</span>{" "}
            predichos
          </div>
        </header>

        <PhaseTabs activeSlug={phase.slug} />

        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Se guarda automáticamente al completar el resultado. No puedes
          editarlo una vez empieza el partido.
        </p>

        {cards.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
            No hay partidos en esta fase.
          </div>
        ) : isGroupStage ? (
          <div className="mt-6 space-y-8">
            {Array.from(cardsByGroup.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([letter, list]) => (
                <section key={letter}>
                  <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300">
                    Grupo {letter}
                    <span className="text-xs text-zinc-600">
                      · {list.length} partido{list.length === 1 ? "" : "s"}
                    </span>
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {list.map((c) => (
                      <MatchCard key={c.id} match={c} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <MatchCard key={c.id} match={c} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PhaseTabs({ activeSlug }: { activeSlug: string }) {
  return (
    <nav
      aria-label="Fases del torneo"
      className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-2 sm:flex-wrap">
        {UI_PHASES.map((p) => {
          const active = p.slug === activeSlug;
          return (
            <li key={p.slug}>
              <Link
                href={`/quiniela/partidos?fase=${p.slug}`}
                className={`block rounded-full border px-3.5 py-1.5 text-sm transition ${
                  active
                    ? "border-indigo-300 bg-indigo-300 text-zinc-950"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white"
                }`}
              >
                {p.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
