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
      "champion_team, runner_up_team, tercer_lugar, top_scoring_team, pichichi_name, pichichi_predicted_goals, final_scorer_name, balon_oro, guante_oro, jugador_revelacion, max_asistidor",
    )
    .eq("user_id", user.id)
    .maybeSingle<ExistingPicks>();

  // ¿Ya empezó el torneo?
  const { data: lockData } = await supabase.rpc("tournament_started");
  const locked = lockData === true;

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p className="eyebrow">Picks especiales · Mundial 2026</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)" }}>
            Tus picks de torneo<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Estas predicciones se cierran cuando arranque el primer partido del
            Mundial (11 de junio). No se editan después.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <Link
            href="/quiniela/puntos"
            className="chip-pill chip-pill--accent"
            style={{ marginBottom: 24 }}
          >
            📖 Cómo se puntúa <span>→</span>
          </Link>

          <PicksForm teams={teams} existing={existing ?? null} locked={locked} />
        </div>
      </section>
    </main>
  );
}
