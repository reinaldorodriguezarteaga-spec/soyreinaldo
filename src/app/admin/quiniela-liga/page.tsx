import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResultsForm, { type Team, type CurrentResult } from "./results-form";

export const metadata = {
  title: "Resultado final · Quiniela LaLiga | Admin | Soy Reinaldo",
};

export default async function AdminQuinielaLigaPage() {
  const supabase = await createClient();

  const { data: teamsData } = await supabase
    .from("lq_teams")
    .select("id, name")
    .order("name");
  const teams = (teamsData ?? []) as Team[];

  const { data: current } = await supabase
    .from("lq_season_results")
    .select(
      "champion_team, pichichi_name, relegated_teams, best_gk_name, best_assist_name, best_defense_team, best_attack_team, mvp_name",
    )
    .eq("id", 1)
    .maybeSingle<CurrentResult>();

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Admin · Quiniela LaLiga
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Resultado final de la quiniela de clubes
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Rellena estos campos al acabar la temporada (o cuando se decidan
            los premios). En cuanto guardes, los puntos de los picks
            especiales se aplican a todo el mundo automáticamente —
            <code className="mx-1 rounded bg-zinc-900 px-1.5 py-0.5 text-[11px]">
              lq_leaderboard()
            </code>
            lee esta fila en cada consulta al ranking.
          </p>
        </header>

        <ResultsForm teams={teams} current={current ?? null} />

        <p className="mt-8 text-xs text-zinc-500">
          ¿Buscas los resultados del Mundial 2026?{" "}
          <Link
            href="/admin/resultado-final"
            className="text-indigo-300 hover:text-indigo-200"
          >
            Resultado final del Mundial →
          </Link>
        </p>
      </div>
    </main>
  );
}
