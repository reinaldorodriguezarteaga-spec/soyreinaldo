import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResultsForm, {
  type Team,
  type CurrentResult,
} from "./results-form";

export const metadata = {
  title: "Resultado final | Admin | Soy Reinaldo",
};

export default async function AdminFinalResultPage() {
  const supabase = await createClient();

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, group_letter, flag_emoji")
    .order("group_letter")
    .order("name");
  const teams = (teamsData ?? []).filter(
    (t): t is Team => !!t.group_letter,
  ) as Team[];

  const { data: current } = await supabase
    .from("tournament_results")
    .select(
      "champion_team, runner_up_team, top_scoring_team, least_conceded_team, pichichi_name, pichichi_actual_goals, final_scorer_names, hat_tricks_count",
    )
    .eq("id", 1)
    .maybeSingle<CurrentResult>();

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Admin · Final del torneo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Resultado final del Mundial 2026
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Rellena estos campos al acabar el torneo. En cuanto guardes, los
            puntos de los picks especiales se aplican a todos los jugadores
            automáticamente.
          </p>
        </header>

        <ResultsForm teams={teams} current={current ?? null} />

        <p className="mt-8 text-xs text-zinc-500">
          ¿Buscas resultados de partidos?{" "}
          <Link
            href="/admin/partidos"
            className="text-indigo-300 hover:text-indigo-200"
          >
            Resultados de partidos →
          </Link>
        </p>
      </div>
    </main>
  );
}
