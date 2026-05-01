import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
};

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
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver a la quiniela
        </Link>

        {justJoined && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
            <p className="leading-relaxed">
              ✓ Acabas de entrar en{" "}
              <span className="font-semibold">{league.name}</span>.
            </p>
            <form action={leaveLeague} className="shrink-0">
              <input type="hidden" name="league_id" value={league.id} />
              <button
                type="submit"
                className="text-xs font-medium text-emerald-200/80 underline-offset-2 transition hover:text-white hover:underline"
                title="Salir de esta liga"
              >
                ¿Te uniste sin querer? Salir →
              </button>
            </form>
          </div>
        )}

        <header className="mt-6 mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
              Ranking · Liga {league.name}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {league.name}
            </h1>
            {league.description && (
              <p className="mt-1 text-sm text-zinc-400">{league.description}</p>
            )}
          </div>
          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-indigo-300">
            {league.code}
          </span>
        </header>

        {leaderboard.length === 0 ? (
          <EmptyState />
        ) : (
          <Leaderboard rows={leaderboard} currentUserId={user.id} />
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center text-sm text-zinc-400">
      <p>Aún no hay nadie en esta liga.</p>
      <p className="mt-2 text-xs text-zinc-500">
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
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-3 text-left font-medium sm:px-4">#</th>
            <th className="px-3 py-3 text-left font-medium sm:px-4">
              Jugador
            </th>
            <th className="hidden px-3 py-3 text-right font-medium sm:table-cell sm:px-4">
              Predichos
            </th>
            <th className="hidden px-3 py-3 text-right font-medium sm:table-cell sm:px-4">
              Exactos
            </th>
            <th className="hidden px-3 py-3 text-right font-medium sm:table-cell sm:px-4">
              Parciales
            </th>
            <th className="hidden px-3 py-3 text-right font-medium md:table-cell md:px-4">
              Picks
            </th>
            <th className="hidden px-3 py-3 text-right font-medium md:table-cell md:px-4">
              Ajustes
            </th>
            <th className="px-3 py-3 text-right font-medium sm:px-4">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {rows.map((r, i) => {
            const isMe = r.user_id === currentUserId;
            const rank = i + 1;
            return (
              <tr
                key={r.user_id}
                className={
                  isMe
                    ? "bg-indigo-500/10"
                    : "transition hover:bg-zinc-900/40"
                }
              >
                <td className="px-3 py-3 sm:px-4">
                  <RankBadge rank={rank} />
                </td>
                <td className="px-3 py-3 font-medium sm:px-4">
                  {r.display_name}
                  {isMe && (
                    <span className="ml-2 rounded bg-indigo-300/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-indigo-300">
                      Tú
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-zinc-400 sm:table-cell sm:px-4">
                  {r.predictions_made}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-emerald-300 sm:table-cell sm:px-4">
                  {r.exact_count}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-zinc-300 sm:table-cell sm:px-4">
                  {r.partial_count}
                </td>
                <td className="hidden px-3 py-3 text-right tabular-nums text-zinc-300 md:table-cell md:px-4">
                  {r.picks_points}
                </td>
                <td
                  className={`hidden px-3 py-3 text-right tabular-nums md:table-cell md:px-4 ${
                    r.adjustment_points < 0
                      ? "text-red-300"
                      : r.adjustment_points > 0
                        ? "text-emerald-300"
                        : "text-zinc-500"
                  }`}
                >
                  {r.adjustment_points > 0 ? "+" : ""}
                  {r.adjustment_points}
                </td>
                <td className="px-3 py-3 text-right text-base font-semibold tabular-nums sm:px-4">
                  {r.total_points}
                </td>
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
    return <span className="text-lg" title="1º">🥇</span>;
  if (rank === 2)
    return <span className="text-lg" title="2º">🥈</span>;
  if (rank === 3)
    return <span className="text-lg" title="3º">🥉</span>;
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center text-xs tabular-nums text-zinc-500">
      {rank}
    </span>
  );
}
