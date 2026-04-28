import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PicksForm, { type Team, type ExistingPicks } from "./picks-form";

export const metadata = {
  title: "Picks especiales | Quiniela | Soy Reinaldo",
};

export default async function PicksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/quiniela/picks");
  }

  // Cargar equipos
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, group_letter, flag_emoji")
    .order("group_letter")
    .order("name");
  const teams = (teamsData ?? []).filter(
    (t): t is Team => !!t.group_letter,
  ) as Team[];

  // Cargar picks existentes
  const { data: existing } = await supabase
    .from("user_picks")
    .select(
      "champion_team, runner_up_team, pichichi_name, pichichi_predicted_goals, final_scorer_name, hat_tricks_count",
    )
    .eq("user_id", user.id)
    .maybeSingle<ExistingPicks>();

  // ¿Ya empezó el torneo?
  const { data: lockData } = await supabase.rpc("tournament_started");
  const locked = lockData === true;

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver a la quiniela
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Picks especiales · Mundial 2026
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tus picks de torneo
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Estas predicciones se cierran cuando arranque el primer partido del
            Mundial (11 de junio). No se editan después.
          </p>
        </header>

        <PicksForm teams={teams} existing={existing ?? null} locked={locked} />
      </div>
    </main>
  );
}
