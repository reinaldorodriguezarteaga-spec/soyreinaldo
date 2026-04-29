import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  UI_PHASES,
  findPhaseBySlug,
  labelForKey,
  type PhaseKey,
} from "@/lib/quiniela/phases";
import MatchResultForm, {
  type AdminMatchData,
} from "./match-result-form";
import ResolveBracketButton from "./resolve-bracket-button";

export const metadata = {
  title: "Resultados | Admin | Soy Reinaldo",
};

type MatchRow = {
  id: number;
  phase: PhaseKey;
  group_letter: string | null;
  kickoff_at: string;
  venue: string | null;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  team_home_placeholder: string | null;
  team_away_placeholder: string | null;
  home: { name: string } | null;
  away: { name: string } | null;
};

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
}) {
  const params = await searchParams;
  const phase = findPhaseBySlug(params.fase);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      id, phase, group_letter, kickoff_at, venue,
      score_home, score_away, finished,
      team_home_placeholder, team_away_placeholder,
      home:team_home(name),
      away:team_away(name)
    `,
    )
    .in("phase", phase.keys)
    .order("kickoff_at", { ascending: true })
    .returns<MatchRow[]>();

  const matches = data ?? [];

  const ready: AdminMatchData[] = [];
  const pending: MatchRow[] = [];
  for (const m of matches) {
    if (m.home && m.away) {
      ready.push({
        id: m.id,
        phaseLabel: labelForKey(m.phase),
        groupLetter: m.group_letter,
        kickoffAt: m.kickoff_at,
        venue: m.venue,
        homeName: m.home.name,
        awayName: m.away.name,
        scoreHome: m.score_home,
        scoreAway: m.score_away,
        finished: m.finished,
      });
    } else {
      pending.push(m);
    }
  }

  const finishedCount = ready.filter((m) => m.finished).length;

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
              Admin · Resultados
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {phase.label}
            </h1>
          </div>
          <div className="text-sm text-zinc-400 tabular-nums">
            <span className="font-semibold text-emerald-400">
              {finishedCount}
            </span>
            <span className="text-zinc-500"> / {ready.length}</span> finalizados
          </div>
        </header>

        <PhaseTabs activeSlug={phase.slug} />

        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Mete el resultado y marca <strong>Finalizado</strong> cuando ya no
          vaya a cambiar. Solo los partidos finalizados cuentan para puntos.
        </p>

        <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
          <p className="mb-2 text-xs text-zinc-400">
            Cuando termine la fase de grupos, pulsa este botón para rellenar
            automáticamente los placeholders directos de los R32 (1A, 2B...).
            Los placeholders compuestos (3A/B/C/D/F) se asignan a mano cuando
            FIFA publique la matriz definitiva.
          </p>
          <ResolveBracketButton />
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-300">
            Error: {error.message}
          </p>
        )}

        <div className="mt-6 space-y-2">
          {ready.length === 0 && pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
              No hay partidos en esta fase.
            </div>
          ) : (
            <>
              {ready.map((m) => (
                <MatchResultForm key={m.id} match={m} />
              ))}
              {pending.length > 0 && (
                <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-5 text-sm text-zinc-400">
                  <p className="font-medium text-zinc-300">
                    Pendientes de definir equipos ({pending.length})
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-zinc-500">
                    {pending.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400">
                          #{m.id}
                        </span>
                        <span>{labelForKey(m.phase)}</span>
                        <span className="text-zinc-600">·</span>
                        <span>
                          {m.team_home_placeholder ?? "?"} vs{" "}
                          {m.team_away_placeholder ?? "?"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-zinc-500">
                    Estos se rellenan automáticamente cuando metas resultados
                    de fase de grupos (en una versión futura). Por ahora,
                    actualízalos por SQL si los necesitas antes.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <p className="mt-10 text-xs text-zinc-500">
          ¿Buscas el campeón / pichichi?{" "}
          <Link
            href="/admin/resultado-final"
            className="text-indigo-300 hover:text-indigo-200"
          >
            Resultado final del torneo →
          </Link>
        </p>
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
                href={`/admin/partidos?fase=${p.slug}`}
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
