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
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <p className="eyebrow">Mundial 2026</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.4rem,6vw,4.5rem)" }}>
            Clasificación por grupos<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Tabla en vivo conforme se juegan los partidos. Los dos primeros de
            cada grupo y los 8 mejores terceros pasan a dieciseisavos.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allStandings.map(({ letter, rows }) => (
              <GroupTable key={letter} letter={letter} rows={rows} />
            ))}
          </div>
        </div>
      </section>
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
    <section className="panel" style={{ overflow: "hidden" }}>
      <header
        className="mono"
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "12px 16px",
          color: "var(--accent)",
          fontWeight: 700,
        }}
      >
        Grupo {letter}
      </header>
      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team_id}>
              <td>
                <RankBadge rank={r.rank} />
              </td>
              <td>
                <span className="club">
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>
                    {r.flag ?? ""}
                  </span>
                  <b>{r.team_name}</b>
                </span>
              </td>
              <td className="tabular-nums" style={{ color: "var(--text-dim)" }}>
                {r.played}
              </td>
              <td
                className="tabular-nums"
                style={{
                  color:
                    r.goal_diff > 0
                      ? "#4ade80"
                      : r.goal_diff < 0
                        ? "#ff8a8a"
                        : "var(--text-dim)",
                }}
              >
                {r.goal_diff > 0 ? "+" : ""}
                {r.goal_diff}
              </td>
              <td className="ptsc">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank <= 2
      ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" }
      : rank === 3
        ? {
            background: "color-mix(in oklch, var(--accent-2) 14%, transparent)",
            color: "var(--accent-2)",
          }
        : { background: "var(--surface-2)", color: "var(--text-dim)" };
  return (
    <span
      className="tabular-nums"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 5,
        fontSize: "0.7rem",
        fontWeight: 700,
        ...style,
      }}
    >
      {rank}
    </span>
  );
}
