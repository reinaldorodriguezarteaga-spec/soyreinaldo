import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PicksForm, { type PickTeam } from "./picks-form";

export const metadata = {
  title: "Selecciones especiales · Quiniela LaLiga 2026-27 | Soy Reinaldo",
};

type TeamMini = { id: number; name: string } | null;
type MdRow = { home: TeamMini; away: TeamMini };

export default async function QuinielaLigaPicksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/quiniela-liga/picks");

  // Los 20 equipos de LaLiga salen de la jornada 1 (todos juegan).
  const { data: mdRows } = await supabase
    .from("lq_matches")
    .select("home:team_home(id, name), away:team_away(id, name)")
    .eq("competition", "laliga")
    .eq("season", 2026)
    .eq("matchday", 1)
    .returns<MdRow[]>();

  const byId = new Map<number, PickTeam>();
  for (const r of mdRows ?? []) {
    if (r.home) byId.set(r.home.id, r.home);
    if (r.away) byId.set(r.away.id, r.away);
  }
  const teams = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));

  const [{ data: pick }, { data: started }] = await Promise.all([
    supabase
      .from("lq_season_picks")
      .select("champion_team, pichichi_name, relegated_teams")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("lq_season_started", { p_comp: "laliga", p_season: 2026 }),
  ]);

  const initial = {
    champion: pick?.champion_team ?? null,
    pichichi: pick?.pichichi_name ?? "",
    relegated: (pick?.relegated_teams ?? []) as number[],
  };
  const locked = started === true;

  return (
    <main className="page">
      <section className="phero" style={{ paddingTop: 8, paddingBottom: 20 }}>
        <div className="wrap">
          <p className="eyebrow">Quiniela · LaLiga 2026-27</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2rem,5vw,3.4rem)" }}>
            Selecciones especiales
          </h1>
          <p className="phero__lede" style={{ marginTop: 8 }}>
            Aciertos que suman a tu clasificación. Se pueden editar hasta que
            arranque LaLiga; luego se bloquean.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 16 }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <PicksForm teams={teams} initial={initial} locked={locked} />
        </div>
      </section>
    </main>
  );
}
