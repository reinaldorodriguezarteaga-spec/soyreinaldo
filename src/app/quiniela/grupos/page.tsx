import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Clasificación por grupos | Quiniela | Soy Reinaldo",
};

const GROUPS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

type StandingRow = {
  team_id: string;
  team_name: string;
  flag: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  rank: number;
};

export default async function GruposPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/quiniela/grupos");

  // Cargar standings de los 12 grupos en paralelo
  const allStandings = await Promise.all(
    GROUPS.map(async (g) => {
      const { data } = await supabase.rpc("group_standings", {
        p_group_letter: g,
      });
      return { letter: g, rows: (data ?? []) as StandingRow[] };
    }),
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver a la quiniela
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Mundial 2026
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Clasificación por grupos
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Tabla en vivo conforme se juegan los partidos. Los dos primeros de
            cada grupo y los 8 mejores terceros pasan a dieciseisavos.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allStandings.map(({ letter, rows }) => (
            <GroupTable key={letter} letter={letter} rows={rows} />
          ))}
        </div>
      </div>
    </main>
  );
}

function GroupTable({
  letter,
  rows,
}: {
  letter: string;
  rows: StandingRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <header className="border-b border-zinc-900 bg-zinc-950/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
        Grupo {letter}
      </header>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-2 py-2 text-left font-medium">#</th>
            <th className="py-2 pr-2 text-left font-medium">Equipo</th>
            <th className="px-1 py-2 text-right font-medium">PJ</th>
            <th className="px-1 py-2 text-right font-medium">DG</th>
            <th className="px-2 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {rows.map((r) => (
            <tr key={r.team_id}>
              <td className="px-2 py-2">
                <RankBadge rank={r.rank} />
              </td>
              <td className="py-2 pr-2">
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">
                    {r.flag ?? ""}
                  </span>
                  <span className="truncate font-medium text-white">
                    {r.team_name}
                  </span>
                </span>
              </td>
              <td className="px-1 py-2 text-right tabular-nums text-zinc-400">
                {r.played}
              </td>
              <td
                className={`px-1 py-2 text-right tabular-nums ${
                  r.goal_diff > 0
                    ? "text-emerald-400"
                    : r.goal_diff < 0
                      ? "text-red-300"
                      : "text-zinc-400"
                }`}
              >
                {r.goal_diff > 0 ? "+" : ""}
                {r.goal_diff}
              </td>
              <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-white">
                {r.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const color =
    rank === 1
      ? "bg-emerald-500/15 text-emerald-300"
      : rank === 2
        ? "bg-emerald-500/10 text-emerald-300"
        : rank === 3
          ? "bg-amber-500/10 text-amber-300"
          : "bg-zinc-800 text-zinc-500";
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold tabular-nums ${color}`}
    >
      {rank}
    </span>
  );
}
