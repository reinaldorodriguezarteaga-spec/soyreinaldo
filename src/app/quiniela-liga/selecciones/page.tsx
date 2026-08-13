import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SeleccionesView, {
  type SeleccionMatch,
  type SeleccionMember,
} from "./selecciones-view";

export const metadata = {
  title: "Selecciones · Quiniela LaLiga 2026-27 | Soy Reinaldo",
};

const PUBLIC_LEAGUE_ID = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";
const LIVE_STATES = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

type TeamMini = { name: string; logo: string | null } | null;
type MatchRow = {
  id: number;
  kickoff_at: string;
  score_home: number | null;
  score_away: number | null;
  finished: boolean;
  status: string | null;
  live_minute: number | null;
  home: TeamMini;
  away: TeamMini;
};
type LbRow = { user_id: string; display_name: string };

export default async function QuinielaLigaSeleccionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/quiniela-liga/selecciones");

  const nowIso = new Date().toISOString();

  const [{ data: lb }, { data: matchRows }] = await Promise.all([
    supabase.rpc("lq_leaderboard", { p_league_id: PUBLIC_LEAGUE_ID }),
    supabase
      .from("lq_matches")
      .select(
        `id, kickoff_at, score_home, score_away, finished, status, live_minute,
         home:team_home(name, logo), away:team_away(name, logo)`,
      )
      .eq("competition", "laliga")
      .eq("season", 2026)
      .lte("kickoff_at", nowIso)
      .order("kickoff_at", { ascending: false })
      .limit(30)
      .returns<MatchRow[]>(),
  ]);

  const members: SeleccionMember[] = ((lb ?? []) as LbRow[]).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
  }));

  const matches = matchRows ?? [];
  const matchIds = matches.map((m) => m.id);

  const picksByMatch = new Map<number, Map<string, { home: number; away: number }>>();
  if (matchIds.length > 0) {
    const { data: preds } = await supabase
      .from("lq_predictions")
      .select("user_id, match_id, score_home, score_away")
      .in("match_id", matchIds);
    for (const p of preds ?? []) {
      let m = picksByMatch.get(p.match_id);
      if (!m) {
        m = new Map();
        picksByMatch.set(p.match_id, m);
      }
      m.set(p.user_id, { home: p.score_home, away: p.score_away });
    }
  }

  const seleccionMatches: SeleccionMatch[] = matches.map((m) => ({
    id: m.id,
    kickoffAt: m.kickoff_at,
    homeName: m.home?.name ?? "—",
    homeLogo: m.home?.logo ?? null,
    awayName: m.away?.name ?? "—",
    awayLogo: m.away?.logo ?? null,
    scoreHome: m.score_home,
    scoreAway: m.score_away,
    finished: m.finished,
    live: m.status != null && LIVE_STATES.includes(m.status),
    minute: m.live_minute,
    compLabel: "LaLiga",
    picks: picksByMatch.get(m.id) ?? new Map(),
  }));

  return (
    <main className="page">
      <section className="phero" style={{ paddingTop: 8, paddingBottom: 16 }}>
        <div className="wrap">
          <p className="eyebrow">Quiniela · LaLiga 2026-27</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>
            Selecciones
          </h1>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap">
          <SeleccionesView
            matches={seleccionMatches}
            members={members}
            currentUserId={user.id}
          />
        </div>
      </section>
    </main>
  );
}
