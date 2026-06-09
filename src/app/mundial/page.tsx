import {
  getWorldCupStandings,
  getWorldCupUpcomingFixtures,
  getWorldCupTopScorers,
  getWorldCupTopAssists,
  getWorldCupTopXg,
  teamGoalLeaders,
  isWorldCupActive,
  type Fixture,
  type WcGroup,
  type PlayerStatLeader,
  type StandingRow,
} from "@/lib/sports/api-football";
import MundialTabs from "./mundial-tabs";

export const metadata = {
  title: "Mundial 2026 | Soy Reinaldo",
  description:
    "Mundial FIFA 2026: próximos partidos, clasificación de los grupos y estadísticas en vivo — goleadores, asistencias y más.",
};

export type XgLeader = { team: { name: string; logo: string }; xg: number };

export type MundialData = {
  fixtures: Fixture[];
  groups: WcGroup[];
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  teamLeaders: { mostScoring: StandingRow | null; mostConceded: StandingRow | null };
  xg: XgLeader | null;
  active: boolean;
};

export default async function MundialPage() {
  let fixtures: Fixture[] = [];
  let groups: WcGroup[] = [];
  let scorers: PlayerStatLeader[] = [];
  let assists: PlayerStatLeader[] = [];
  let xg: XgLeader | null = null;

  try {
    [fixtures, groups, scorers, assists, xg] = await Promise.all([
      getWorldCupUpcomingFixtures(12),
      getWorldCupStandings(),
      getWorldCupTopScorers(5),
      getWorldCupTopAssists(5),
      getWorldCupTopXg(),
    ]);
  } catch {
    // estados vacíos en cada vista
  }

  const teamLeaders = teamGoalLeaders(groups);
  const active = isWorldCupActive();

  const data: MundialData = {
    fixtures,
    groups,
    scorers,
    assists,
    teamLeaders,
    xg,
    active,
  };

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <p className="eyebrow">FIFA · 11 jun – 19 jul</p>
          <h1 className="phero__title">
            Mundial <span style={{ color: "var(--accent)" }}>2026</span>
            <span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Próximos partidos, los 12 grupos y las estadísticas del torneo —
            goleadores, asistencias y más, en vivo durante el Mundial.
          </p>
        </div>
      </section>

      <MundialTabs data={data} />
    </main>
  );
}
