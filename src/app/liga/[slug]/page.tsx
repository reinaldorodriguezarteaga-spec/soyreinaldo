import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompetitionUpcomingFixtures,
  getCompetitionFinishedFixtures,
  getCompetitionStandings,
  getCompetitionFixturesWindow,
  getCompetitionPlayerStats,
  teamAttackDefenseFromFixtures,
  isLive,
  type Fixture,
  type PlayerStatLeader,
  type StandingRow,
} from "@/lib/sports/api-football";
import { attachEvents, type WcFixture } from "@/lib/sports/widget-data";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import LigaTabs, { type LigaTab } from "./liga-tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  return {
    title: `${competition.name} | Soy Reinaldo`,
    description: `${competition.name}: próximos partidos, tabla de clasificación y estadísticas en vivo — goleadores, asistencias y más.`,
  };
}

export type LigaData = {
  fixtures: Fixture[];
  finished: Fixture[];
  standings: StandingRow[];
  today: WcFixture[];
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  ratings: PlayerStatLeader[];
  cards: PlayerStatLeader[];
  attackDefense: { attack: StandingRow[]; defense: StandingRow[] };
};

function normalizeView(v: string | undefined): LigaTab | null {
  if (v === "envivo" || v === "live" || v === "marcador") return "envivo";
  if (v === "tabla" || v === "clasificacion") return "tabla";
  if (v === "jugadores" || v === "players") return "jugadores";
  if (v === "stats" || v === "estadisticas") return "stats";
  if (v === "finalizados" || v === "resultados") return "finalizados";
  return v ? "partidos" : null;
}

export default async function LigaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { slug } = await params;
  const competition: Competition | undefined = COMPETITIONS_BY_SLUG[slug];
  if (!competition) notFound();

  const { v } = await searchParams;

  let fixtures: Fixture[] = [];
  let finished: Fixture[] = [];
  let standings: StandingRow[] = [];
  let today: WcFixture[] = [];
  let players: {
    scorers: PlayerStatLeader[];
    assists: PlayerStatLeader[];
    ratings: PlayerStatLeader[];
    cards: PlayerStatLeader[];
  } = { scorers: [], assists: [], ratings: [], cards: [] };

  try {
    const [fixturesR, finishedR, standingsR, todayR, playersR] = await Promise.all([
      getCompetitionUpcomingFixtures(competition, 12),
      getCompetitionFinishedFixtures(competition),
      getCompetitionStandings(competition),
      getCompetitionFixturesWindow(competition).then(attachEvents),
      getCompetitionPlayerStats(competition, 10),
    ]);
    fixtures = fixturesR;
    finished = finishedR;
    // competition.standingsMode === "table" para todo lo que hay en COMPETITIONS
    // hoy (solo LaLiga) → siempre fila plana, nunca por grupos.
    standings = (standingsR as StandingRow[] | null) ?? [];
    today = todayR;
    players = playersR;
  } catch {
    // estados vacíos en cada vista
  }

  const { scorers, assists, ratings, cards } = players;
  const attackDefense = teamAttackDefenseFromFixtures(finished);

  const carryIds = today.filter(isLive).map((f) => f.fixture.id);
  const view = normalizeView(v) ?? (carryIds.length > 0 ? "envivo" : "partidos");

  const data: LigaData = {
    fixtures,
    finished,
    standings,
    today,
    scorers,
    assists,
    ratings,
    cards,
    attackDefense,
  };

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 24 }}>
        <div className="wrap">
          <p className="eyebrow">Fútbol de clubes</p>
          <h1 className="phero__title">
            {competition.name}
            <span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Próximos partidos, tabla de clasificación y estadísticas de la
            temporada — goleadores, asistencias y más, en vivo.
          </p>
          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={`/liga/${competition.slug}/buscar`} className="btn btn--ghost">
              🔍 Buscar equipo o jugador
            </Link>
            {competition.koStructure && (
              <Link href={`/liga/${competition.slug}/bracket`} className="btn btn--ghost">
                🏆 Eliminatorias
              </Link>
            )}
          </div>
        </div>
      </section>

      <LigaTabs competition={competition} data={data} view={view} />
    </main>
  );
}
