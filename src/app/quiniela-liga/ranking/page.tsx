import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyClubLeagues, pickLeague, leagueHref } from "@/lib/quiniela-liga/leagues";
import LeagueSwitcher from "../league-switcher";

/** Liga pública "Quiniela LaLiga 2026-27": lo que ve quien no ha entrado. */
const PUBLIC_LEAGUE_ID = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";

export const metadata = {
  title: "Clasificación · Quiniela LaLiga 2026-27 | Soy Reinaldo",
};

type Row = {
  user_id: string;
  display_name: string;
  prediction_points: number;
  adjustment_points: number;
  total_points: number;
  exact_count: number;
  partial_count: number;
  predictions_made: number;
};

export default async function QuinielaLigaRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string }>;
}) {
  const { liga } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const leagues = user ? await getMyClubLeagues(user.id) : [];
  const active = pickLeague(leagues, liga);
  const leagueId = active?.id ?? PUBLIC_LEAGUE_ID;

  const { data } = await supabase.rpc("lq_leaderboard", {
    p_league_id: leagueId,
  });
  const rows = (data ?? []) as Row[];
  const meId = user?.id ?? null;

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <Link
            href={leagueHref("/quiniela-liga/partidos", active)}
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Pronósticos
          </Link>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,4rem)", marginTop: 12 }}>
            Clasificación
          </h1>
          <p className="phero__lede" style={{ marginTop: 8 }}>
            {active && !active.isPublic ? `${active.name} · ` : ""}
            LaLiga 2026-27 · marcador exacto 3 pts, acertar el ganador 1 pt.
          </p>
          {active && (!active.isPublic || active.role === "admin") && (
            <p style={{ marginTop: 12 }}>
              <Link
                href={`/quiniela-liga/liga/${encodeURIComponent(active.id)}`}
                className="btn"
              >
                {active.role === "admin" ? "Gestionar liga" : "Ver liga"}{" "}
                <span className="arr">→</span>
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <LeagueSwitcher
            leagues={leagues}
            active={active}
            basePath="/quiniela-liga/ranking"
          />
          {rows.length === 0 ? (
            <div
              className="panel"
              style={{
                padding: 32,
                textAlign: "center",
                borderStyle: "dashed",
                color: "var(--text-dim)",
              }}
            >
              Todavía no hay nadie en la clasificación. Haz tu primer pronóstico
              y aparecerás aquí.
              <div style={{ marginTop: 16 }}>
                <Link
                  href={leagueHref("/quiniela-liga/partidos", active)}
                  className="btn btn--accent"
                >
                  Ir a pronosticar <span className="arr">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ overflowX: "auto" }}>
              <table className="board">
                <thead>
                  <tr>
                    <th className="pos">#</th>
                    <th>Jugador</th>
                    <th style={{ textAlign: "right" }}>Exactos</th>
                    <th className="hidem" style={{ textAlign: "right" }}>Aciertos</th>
                    <th className="pts">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.user_id} className={r.user_id === meId ? "me" : undefined}>
                      <td className={`pos${i < 3 ? " top" : ""}`}>{i + 1}</td>
                      <td className="who">{r.display_name}</td>
                      <td style={{ textAlign: "right" }}>{r.exact_count}</td>
                      <td className="hidem" style={{ textAlign: "right" }}>{r.partial_count}</td>
                      <td className="pts">{r.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
