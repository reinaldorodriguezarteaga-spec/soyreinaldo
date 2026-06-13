import {
  getWorldCupStandings,
  getWorldCupUpcomingFixtures,
  getWorldCupFinishedFixtures,
  getWorldCupFixturesWindow,
  getWorldCupPlayerStats,
  getWorldCupTopXg,
  teamAttackDefense,
  isWorldCupActive,
  isLive,
  type Fixture,
  type WcGroup,
  type PlayerStatLeader,
  type StandingRow,
} from "@/lib/sports/api-football";
import MundialTabs, { type Tab } from "./mundial-tabs";

export const metadata = {
  title: "Mundial 2026 | Soy Reinaldo",
  description:
    "Mundial FIFA 2026: próximos partidos, clasificación de los grupos y estadísticas en vivo — goleadores, asistencias y más.",
};

export type XgLeader = { team: { name: string; logo: string }; xg: number };

export type MundialData = {
  fixtures: Fixture[];
  finished: Fixture[];
  groups: WcGroup[];
  /** Partidos de la jornada de hoy (en juego, recientes y próximos). */
  today: Fixture[];
  /** Ids de partidos en juego en el render — la pestaña "en vivo" los sigue
   * aplicando a la tabla provisional si terminan con la página abierta. */
  carryIds: number[];
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  ratings: PlayerStatLeader[];
  attackDefense: { attack: StandingRow[]; defense: StandingRow[] };
  xg: XgLeader | null;
  active: boolean;
};

function normalizeView(v: string | undefined): Tab | null {
  if (v === "envivo" || v === "live" || v === "marcador") return "envivo";
  if (v === "grupos") return "grupos";
  if (v === "stats" || v === "estadisticas") return "stats";
  if (v === "finalizados" || v === "resultados") return "finalizados";
  return v ? "partidos" : null;
}

export default async function MundialPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;

  let fixtures: Fixture[] = [];
  let finished: Fixture[] = [];
  let groups: WcGroup[] = [];
  let today: Fixture[] = [];
  let players: {
    scorers: PlayerStatLeader[];
    assists: PlayerStatLeader[];
    ratings: PlayerStatLeader[];
  } = { scorers: [], assists: [], ratings: [] };
  let xg: XgLeader | null = null;

  try {
    [fixtures, finished, groups, today, players, xg] = await Promise.all([
      getWorldCupUpcomingFixtures(12),
      getWorldCupFinishedFixtures(16),
      getWorldCupStandings(),
      getWorldCupFixturesWindow(),
      getWorldCupPlayerStats(10),
      getWorldCupTopXg(),
    ]);
  } catch {
    // estados vacíos en cada vista
  }

  const { scorers, assists, ratings } = players;
  const attackDefense = teamAttackDefense(groups);
  const active = isWorldCupActive();
  const carryIds = today.filter(isLive).map((f) => f.fixture.id);

  // Sin ?v= explícito, abrir en "Marcador en vivo" si hay partido en juego.
  const view = normalizeView(v) ?? (carryIds.length > 0 ? "envivo" : "partidos");

  const data: MundialData = {
    fixtures,
    finished,
    groups,
    today,
    carryIds,
    scorers,
    assists,
    ratings,
    attackDefense,
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

      <MundialTabs data={data} view={view} />
    </main>
  );
}
