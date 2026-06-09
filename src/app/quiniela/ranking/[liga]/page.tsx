import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyInviteIcon from "@/components/CopyInviteIcon";
import { leaveLeague } from "@/app/quiniela/actions";

export const metadata = {
  title: "Ranking | Quiniela | Soy Reinaldo",
};

type LeagueRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

type LeaderboardRow = {
  user_id: string;
  display_name: string;
  prediction_points: number;
  picks_points: number;
  adjustment_points: number;
  total_points: number;
  exact_count: number;
  partial_count: number;
  predictions_made: number;
  picks_made: number;
};

const TOTAL_PICKS = 10; // campeón, subcampeón, 3º, equipo goleador, pichichi, balón oro, guante, revelación, asistidor, goleador final

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const { liga: leagueId } = await params;
  const { bienvenida } = await searchParams;
  const justJoined = bienvenida === "1";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/quiniela/ranking/${leagueId}`);
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code, description")
    .eq("id", leagueId)
    .maybeSingle<LeagueRow>();

  if (!league) notFound();

  // Verifica que el usuario es miembro (o admin) — si no, fuera
  const { data: membership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!membership && !profile?.is_admin) {
    redirect("/quiniela");
  }

  const { data: rows } = await supabase.rpc("league_leaderboard", {
    p_league_id: leagueId,
  });
  const leaderboard = (rows ?? []) as LeaderboardRow[];

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          {justJoined && (
            <div
              className="notice notice--ok flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ marginBottom: 24 }}
            >
              <p style={{ margin: 0 }}>
                ✓ Acabas de entrar en{" "}
                <strong style={{ color: "var(--text)" }}>{league.name}</strong>.
              </p>
              <form action={leaveLeague} className="shrink-0">
                <input type="hidden" name="league_id" value={league.id} />
                <button
                  type="submit"
                  className="mono"
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--text-dim)",
                    cursor: "pointer",
                  }}
                  title="Salir de esta liga"
                >
                  ¿Te uniste sin querer? Salir →
                </button>
              </form>
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">Ranking · Liga {league.name}</p>
              <h1
                className="phero__title"
                style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)" }}
              >
                {league.name}
              </h1>
              {league.description && (
                <p className="phero__lede" style={{ marginTop: 12 }}>
                  {league.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="codepill">{league.code}</span>
              {profile?.is_admin && <CopyInviteIcon code={league.code} />}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          {leaderboard.length === 0 ? (
            <EmptyState />
          ) : (
            <Leaderboard rows={leaderboard} currentUserId={user.id} />
          )}

          <p
            className="hint"
            style={{ marginTop: 24, textAlign: "center" }}
          >
            ¿Dudas con la suma?{" "}
            <Link href="/quiniela/puntos" style={{ color: "var(--accent)" }}>
              Cómo se puntúa →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div
      className="panel"
      style={{
        padding: 32,
        textAlign: "center",
        borderStyle: "dashed",
        color: "var(--text-dim)",
      }}
    >
      <p style={{ margin: 0 }}>Aún no hay nadie en esta liga.</p>
      <p className="hint" style={{ marginTop: 8 }}>
        Comparte el código para que entren los demás.
      </p>
    </div>
  );
}

function Leaderboard({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId: string;
}) {
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th className="hidden text-right sm:table-cell">Predichos</th>
            <th className="hidden text-right sm:table-cell">Especiales</th>
            <th className="hidden text-right sm:table-cell">Exactos</th>
            <th className="hidden text-right sm:table-cell">Parciales</th>
            <th className="hidden text-right md:table-cell">Picks</th>
            <th className="hidden text-right md:table-cell">Ajustes</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isMe = r.user_id === currentUserId;
            const rank = i + 1;
            return (
              <tr key={r.user_id} className={isMe ? "me" : undefined}>
                <td className="pos">
                  <RankBadge rank={rank} />
                </td>
                <td className="who">
                  {r.display_name}
                  {isMe && (
                    <span className="badge badge--accent" style={{ marginLeft: 8 }}>
                      Tú
                    </span>
                  )}
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{ color: "var(--text-dim)" }}
                >
                  {r.predictions_made}
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{
                    color:
                      r.picks_made >= TOTAL_PICKS
                        ? "#4ade80"
                        : r.picks_made > 0
                          ? "var(--text)"
                          : "var(--text-dim)",
                  }}
                  title="Picks especiales completados"
                >
                  {r.picks_made}/{TOTAL_PICKS}
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{ color: "#4ade80" }}
                >
                  {r.exact_count}
                </td>
                <td className="hidden text-right tabular-nums sm:table-cell">
                  {r.partial_count}
                </td>
                <td className="hidden text-right tabular-nums md:table-cell">
                  {r.picks_points}
                </td>
                <td
                  className="hidden text-right tabular-nums md:table-cell"
                  style={{
                    color:
                      r.adjustment_points < 0
                        ? "#ff8a8a"
                        : r.adjustment_points > 0
                          ? "#4ade80"
                          : "var(--text-dim)",
                  }}
                >
                  {r.adjustment_points > 0 ? "+" : ""}
                  {r.adjustment_points}
                </td>
                <td className="pts">{r.total_points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span style={{ fontSize: "1.2rem" }} title="1º">
        🥇
      </span>
    );
  if (rank === 2)
    return (
      <span style={{ fontSize: "1.2rem" }} title="2º">
        🥈
      </span>
    );
  if (rank === 3)
    return (
      <span style={{ fontSize: "1.2rem" }} title="3º">
        🥉
      </span>
    );
  return <span className={rank <= 3 ? "top" : undefined}>{rank}</span>;
}
