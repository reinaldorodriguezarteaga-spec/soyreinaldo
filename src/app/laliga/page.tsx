import Image from "next/image";
import {
  getLaligaStandings,
  getLaligaUpcomingFixtures,
  isFinal,
  isLive,
  type Fixture,
  type StandingRow,
} from "@/lib/sports/api-football";

export const metadata = {
  title: "LaLiga | Soy Reinaldo",
  description:
    "Clasificación completa de LaLiga y próximos partidos de Primera División.",
};

const HIGHLIGHT_TEAMS = new Set([529, 541]); // Barça, Madrid
const MADRID_TZ = "Europe/Madrid";

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .toUpperCase();
}

function zoneClass(rank: number, total: number): string {
  if (rank <= 5) return "ucl";
  if (rank <= 7) return "uel";
  if (rank > total - 3) return "rel";
  return "";
}

export default async function LaligaPage() {
  let standings: StandingRow[] = [];
  let fixtures: Fixture[] = [];
  try {
    [standings, fixtures] = await Promise.all([
      getLaligaStandings(),
      getLaligaUpcomingFixtures(10),
    ]);
  } catch {
    // estado vacío abajo
  }

  const total = standings.length;
  const round = fixtures[0]?.league.round ?? null;

  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">
            Primera División · Temporada 2025/26
            {standings.length > 0 ? ` · Jornada ${standings[0]?.all.played}` : ""}
          </p>
          <h1 className="phero__title">
            La<span className="dot">Liga.</span>
          </h1>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {/* Próxima jornada */}
          <div className="shead">
            <h2>Próxima jornada</h2>
            {round && <span className="sh-note">{round}</span>}
          </div>
          {fixtures.length === 0 ? (
            <div className="panel" style={{ padding: 28, color: "var(--text-dim)" }}>
              Sin partidos próximos en el calendario.
            </div>
          ) : (
            <div className="grid2" style={{ marginBottom: 56 }}>
              {fixtures.map((fx) => {
                const showScore = isLive(fx) || isFinal(fx);
                return (
                  <div className="match" key={fx.fixture.id}>
                    <div className="match__meta">
                      <span className="match__grp">{fx.league.round}</span>
                      <span className="match__when">
                        {formatKickoff(fx.fixture.date)}
                      </span>
                    </div>
                    <div className="team">
                      <span className="flag">
                        <Image src={fx.teams.home.logo} alt="" width={20} height={20} unoptimized />
                      </span>
                      <span className="tn">{fx.teams.home.name}</span>
                    </div>
                    <div className="score">
                      {showScore ? (
                        <>
                          <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
                            {fx.goals.home ?? 0}
                          </b>
                          <span className="vs">–</span>
                          <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
                            {fx.goals.away ?? 0}
                          </b>
                        </>
                      ) : (
                        <span className="vs">VS</span>
                      )}
                    </div>
                    <div className="team right">
                      <span className="tn">{fx.teams.away.name}</span>
                      <span className="flag">
                        <Image src={fx.teams.away.logo} alt="" width={20} height={20} unoptimized />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Clasificación */}
          <div className="shead">
            <h2>Clasificación</h2>
            <span className="sh-note">
              <span className="zone ucl" /> Champions{"  "}
              <span className="zone uel" style={{ marginLeft: 12 }} /> Europa{"  "}
              <span className="zone rel" style={{ marginLeft: 12 }} /> Descenso
            </span>
          </div>
          {standings.length === 0 ? (
            <div className="panel" style={{ padding: 28, color: "var(--text-dim)" }}>
              Sin datos disponibles ahora mismo.
            </div>
          ) : (
            <div className="panel" style={{ overflowX: "auto" }}>
              <table className="standings">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Club</th>
                    <th className="hidem">PJ</th>
                    <th className="hidem">DG</th>
                    <th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r) => (
                    <tr key={r.team.id} className={HIGHLIGHT_TEAMS.has(r.team.id) ? "hl" : ""}>
                      <td>
                        <span className="pos">{r.rank}</span>
                      </td>
                      <td>
                        <span className="club">
                          <Image className="crest" src={r.team.logo} alt="" width={26} height={26} unoptimized />
                          <b>{r.team.name}</b>
                        </span>
                      </td>
                      <td className="hidem">{r.all.played}</td>
                      <td className="hidem">{r.goalsDiff > 0 ? `+${r.goalsDiff}` : r.goalsDiff}</td>
                      <td>
                        <span className="ptsc">
                          <span className={`zone ${zoneClass(r.rank, total)}`} />
                          {r.points}
                        </span>
                      </td>
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
