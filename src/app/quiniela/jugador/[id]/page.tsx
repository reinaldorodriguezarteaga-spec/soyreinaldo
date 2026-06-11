import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Picks del jugador | Quiniela | Soy Reinaldo",
};

/** Mismo cálculo que el resto de la app: 3 exacto, 1 signo, 0 fallo. */
function computePoints(
  scoreH: number,
  scoreA: number,
  predH: number,
  predA: number,
): number {
  if (scoreH === predH && scoreA === predA) return 3;
  if (Math.sign(scoreH - scoreA) === Math.sign(predH - predA)) return 1;
  return 0;
}

type PredRow = {
  score_home: number;
  score_away: number;
  match: {
    id: number;
    kickoff_at: string;
    score_home: number | null;
    score_away: number | null;
    finished: boolean;
    status: string | null;
    home: { name: string; flag_emoji: string | null } | null;
    away: { name: string; flag_emoji: string | null } | null;
    team_home_placeholder: string | null;
    team_away_placeholder: string | null;
  } | null;
};

type PicksRow = {
  champion_team: string | null;
  runner_up_team: string | null;
  tercer_lugar: string | null;
  top_scoring_team: string | null;
  pichichi_name: string | null;
  pichichi_predicted_goals: number | null;
  final_scorer_name: string | null;
  balon_oro: string | null;
  guante_oro: string | null;
  jugador_revelacion: string | null;
  max_asistidor: string | null;
};

const LIVE_STATES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

export default async function JugadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/quiniela`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  // Pronósticos del jugador en partidos YA EMPEZADOS. La RLS garantiza que
  // solo se ven si compartes liga (o eres admin / tú mismo) y el partido
  // arrancó — aquí no se puede copiar a nadie.
  const { data: predsData } = await supabase
    .from("predictions")
    .select(
      `score_home, score_away,
       match:matches(id, kickoff_at, score_home, score_away, finished, status,
         team_home_placeholder, team_away_placeholder,
         home:team_home(name, flag_emoji), away:team_away(name, flag_emoji))`,
    )
    .eq("user_id", id)
    .returns<PredRow[]>();

  const started = (predsData ?? [])
    .filter((p) => p.match && new Date(p.match.kickoff_at) <= new Date())
    .sort(
      (a, b) =>
        new Date(b.match!.kickoff_at).getTime() -
        new Date(a.match!.kickoff_at).getTime(),
    );

  const isSelf = user.id === id;

  // Picks especiales (RLS: visibles entre compañeros de liga desde el arranque)
  const { data: picks } = await supabase
    .from("user_picks")
    .select(
      "champion_team, runner_up_team, tercer_lugar, top_scoring_team, pichichi_name, pichichi_predicted_goals, final_scorer_name, balon_oro, guante_oro, jugador_revelacion, max_asistidor",
    )
    .eq("user_id", id)
    .maybeSingle<PicksRow>();

  // Nombres de equipos para los picks de selección
  const teamIds = [
    picks?.champion_team,
    picks?.runner_up_team,
    picks?.tercer_lugar,
    picks?.top_scoring_team,
  ].filter((t): t is string => !!t);
  const teamNames = new Map<string, { name: string; flag: string }>();
  if (teamIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, flag_emoji")
      .in("id", teamIds);
    for (const t of teams ?? []) {
      teamNames.set(t.id, { name: t.name, flag: t.flag_emoji ?? "" });
    }
  }
  const teamLabel = (tid: string | null | undefined) => {
    if (!tid) return null;
    const t = teamNames.get(tid);
    return t ? `${t.flag} ${t.name}`.trim() : tid;
  };

  const specialPicks: Array<{ label: string; value: string | null }> = [
    { label: "Campeón", value: teamLabel(picks?.champion_team) },
    { label: "Subcampeón", value: teamLabel(picks?.runner_up_team) },
    { label: "Tercer lugar", value: teamLabel(picks?.tercer_lugar) },
    { label: "Equipo más goleador", value: teamLabel(picks?.top_scoring_team) },
    {
      label: "Pichichi",
      value: picks?.pichichi_name
        ? `${picks.pichichi_name}${picks.pichichi_predicted_goals != null ? ` (${picks.pichichi_predicted_goals} goles)` : ""}`
        : null,
    },
    { label: "Goleador en la final", value: picks?.final_scorer_name ?? null },
    { label: "Balón de oro", value: picks?.balon_oro ?? null },
    { label: "Guante de oro", value: picks?.guante_oro ?? null },
    { label: "Jugador revelación", value: picks?.jugador_revelacion ?? null },
    { label: "Máximo asistidor", value: picks?.max_asistidor ?? null },
  ];
  const hasSpecials = specialPicks.some((p) => p.value);

  const totalPts = started.reduce((acc, p) => {
    const m = p.match!;
    if (!m.finished || m.score_home == null || m.score_away == null) return acc;
    return acc + computePoints(m.score_home, m.score_away, p.score_home, p.score_away);
  }, 0);

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <p className="eyebrow">Picks del jugador</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,4.2rem)" }}>
            {profile.display_name ?? "Jugador"}
          </h1>
          <p className="phero__lede">
            Solo se muestran pronósticos de partidos que ya han empezado — aquí
            no se puede copiar a nadie 😉
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          {started.length === 0 && !hasSpecials ? (
            <div className="panel" style={{ padding: 32, textAlign: "center", borderStyle: "dashed", color: "var(--text-dim)" }}>
              Nada que ver todavía: o este jugador no está en ninguna de tus
              ligas, o aún no ha empezado ningún partido que pronosticara.
            </div>
          ) : (
            <>
              <div className="shead">
                <h2>Pronósticos</h2>
                <span className="sh-note">
                  {started.length} partido{started.length === 1 ? "" : "s"} ·{" "}
                  {totalPts} pts en marcadores
                </span>
              </div>
              {started.length === 0 ? (
                <p className="hint">Sin pronósticos en partidos ya jugados.</p>
              ) : (
                <div className="panel" style={{ overflowX: "auto" }}>
                  <table className="board">
                    <thead>
                      <tr>
                        <th>Partido</th>
                        <th className="text-right">Su pick</th>
                        <th className="text-right">Real</th>
                        <th className="text-right">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {started.map((p) => {
                        const m = p.match!;
                        const homeN = m.home?.name ?? m.team_home_placeholder ?? "TBD";
                        const awayN = m.away?.name ?? m.team_away_placeholder ?? "TBD";
                        const live = m.status != null && LIVE_STATES.has(m.status);
                        const hasReal = m.score_home != null && m.score_away != null;
                        const pts =
                          m.finished && hasReal
                            ? computePoints(m.score_home!, m.score_away!, p.score_home, p.score_away)
                            : null;
                        return (
                          <tr key={m.id}>
                            <td className="who">
                              {m.home?.flag_emoji ?? ""} {homeN} – {awayN}{" "}
                              {m.away?.flag_emoji ?? ""}
                              {live && (
                                <span className="badge badge--danger" style={{ marginLeft: 8 }}>
                                  <span className="livepulse" /> en juego
                                </span>
                              )}
                            </td>
                            <td className="text-right tabular-nums" style={{ fontWeight: 700 }}>
                              {p.score_home}–{p.score_away}
                            </td>
                            <td className="text-right tabular-nums" style={{ color: "var(--text-dim)" }}>
                              {hasReal ? `${m.score_home}–${m.score_away}` : "—"}
                            </td>
                            <td className="pts">
                              {pts == null ? (
                                <span style={{ color: "var(--text-dim)" }}>—</span>
                              ) : (
                                <span
                                  className={`badge ${pts === 3 ? "badge--ok" : pts === 1 ? "badge--accent" : ""}`}
                                >
                                  {pts > 0 ? `+${pts}` : pts}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {hasSpecials && (
                <>
                  <div className="shead" style={{ marginTop: 40 }}>
                    <h2>Picks especiales</h2>
                    <span className="sh-note">bloqueados desde el arranque</span>
                  </div>
                  <div className="grid2">
                    {specialPicks
                      .filter((sp) => sp.value)
                      .map((sp) => (
                        <div key={sp.label} className="pickblock">
                          <p className="pickblock__lbl">{sp.label}</p>
                          <p style={{ margin: "6px 0 0", fontWeight: 700, fontSize: "1.05rem" }}>
                            {sp.value}
                          </p>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </>
          )}

          <p className="hint" style={{ marginTop: 32 }}>
            {isSelf ? "Así te ven los demás. " : ""}
            <Link href="/quiniela" style={{ color: "var(--accent)" }}>
              ← Volver a la quiniela
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
