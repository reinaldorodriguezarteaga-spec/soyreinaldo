import { cache, Suspense } from "react";
import TeamAnalisis from "./team-analisis";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cuotaAgotada,
  frenoActivo,
  getTeamCoach,
  getTeamFixtures,
  getTeamSquad,
  getTeamStatistics,
  getCompetitionStandings,
  getCompetitionFixturesWindow,
  type Coach,
  type Fixture,
  type SquadPlayer,
  type StandingRow,
  type TeamSeasonStats,
} from "@/lib/sports/api-football";
import JsonLd, { absolute } from "@/lib/seo/json-ld";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import { isFavorited } from "@/app/actions/favorites";
import FavoriteStar from "@/components/FavoriteStar";
import { StandingsTableView } from "@/components/competition/tab-views";
import TeamStats from "./team-stats";
import { perfilAlDia } from "@/lib/sports/perfil-al-dia";
import TeamTabs from "./team-tabs";
import TeamFixturesList from "./fixtures-list";
import TeamOverview from "./team-overview";

// Metadatos y contenido comparten la misma lectura: antes los metadatos
// pedían last:1 y next:0, además de los dos listados de la ficha.
const fixturesDelEquipo = cache((teamId: number) => getTeamFixtures(teamId, { last: 40, next: 40 }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  const { team } = await fixturesDelEquipo(Number(id)).catch(
    () => ({ team: null }) as { team: null },
  );
  if (!team) return { title: `Equipo · ${competition.name} | Soy Reinaldo` };
  const title = `${team.name} · Historial · ${competition.name}`;
  const description = `Partidos, resultados y calendario de ${team.name} en ${competition.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/liga/${slug}/equipo/${id}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}



export default async function LigaEquipoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const competition: Competition | undefined = COMPETITIONS_BY_SLUG[slug];
  if (!competition) notFound();

  const teamId = Number(id);
  if (!Number.isFinite(teamId)) notFound();

  // Todo arranca a la vez, pero solo el calendario y su estado en vivo
  // son necesarios para enseñar el equipo y sus próximos partidos.
  const statsPromise = getTeamStatistics(teamId, { league: competition.leagueId, season: competition.season }).catch(() => null);
  const squadPromise = getTeamSquad(teamId).catch(() => [] as SquadPlayer[]);
  const coachPromise = getTeamCoach(teamId).catch(() => null as Coach | null);
  const standingsPromise = getCompetitionStandings(competition).catch(() => null) as Promise<StandingRow[] | null>;
  const favoritedPromise = isFavorited("team", String(teamId)).catch(() => false);
  const [{ team, recent, upcoming }, liveFixtures] = await Promise.all([
    fixturesDelEquipo(teamId),
    getCompetitionFixturesWindow(competition).catch(() => [] as Fixture[]),
  ]);

  if (!team && recent.length === 0 && upcoming.length === 0) {
    if (cuotaAgotada() || frenoActivo()) {
      throw new Error("API-Football sin cuota: ficha no disponible ahora");
    }
    notFound();
  }

  // Historial + calendario en una sola lista cronológica ascendente (FotMob).
  //
  // `recent`/`upcoming` vienen de una caché que puede tener hasta 30 min
  // (sin cron precalculado para esta combinación last:40/next:40 — ver
  // comentario en el fetch de arriba) — recién acabado un partido, el
  // dueño reportó que tardaba en aparecer aquí. `liveFixtures` (la ventana
  // ±12h/+14h que ya se pide para la clasificación en directo, caché de
  // 45s) tiene el estado real de cualquier partido de este equipo jugado
  // en las últimas 12h, así que se usa para PISAR la versión vieja (o
  // añadirla si `recent` todavía no la tenía) antes de dedupear.
  const byId = new Map<number, Fixture>();
  for (const f of [...recent, ...upcoming]) byId.set(f.fixture.id, f);
  for (const f of liveFixtures) {
    if (f.teams.home.id === teamId || f.teams.away.id === teamId) {
      byId.set(f.fixture.id, f);
    }
  }
  const allFixtures = [...byId.values()].sort(
    (a, b) =>
      new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime(),
  );

  const base = `/liga/${competition.slug}`;

  return (
    <main className="page">
      {team && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "SportsTeam",
            name: team.name,
            sport: "Soccer",
            ...(team.logo ? { logo: team.logo } : {}),
            url: absolute(`/liga/${competition.slug}/equipo/${teamId}`),
            memberOf: { "@type": "SportsOrganization", name: competition.name },
          }}
        />
      )}
      <section className="phero" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <Link
            href={base}
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← {competition.name}
          </Link>

          <div
            className="flex items-center gap-4"
            style={{ marginTop: 16 }}
          >
            {team?.logo && (
              <Image
                src={team.logo}
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1
                  className="phero__title"
                  style={{ fontSize: "clamp(2rem,6vw,3.4rem)", margin: 0 }}
                >
                  {team?.name ?? "Equipo"}
                </h1>
                {team && (
                  <Suspense fallback={<span style={{ width: 40, height: 40 }} aria-hidden />}>
                    <TeamFavorite teamId={teamId} team={team} competition={competition} favorited={favoritedPromise} />
                  </Suspense>
                )}
              </div>
              <Suspense fallback={<p className="phero__lede" style={{ marginTop: 6 }}>Historial de partidos — toca cualquiera para ver sus estadísticas.</p>}>
                <TeamCoach coachPromise={coachPromise} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap space-y-8">
          <TeamOverview fixtures={allFixtures} teamId={teamId} slug={competition.slug} />
          <Suspense fallback={null}>
            <TeamAnalisis
              teamId={teamId}
              nombre={team?.name ?? ""}
              fixtureIds={allFixtures.map((f) => f.fixture.id)}
            />
          </Suspense>
          <Suspense fallback={null}>
            <TeamSeason statsPromise={statsPromise} partidos={allFixtures} teamId={teamId} />
          </Suspense>

          <Suspense fallback={<TeamFixturesList fixtures={allFixtures} slug={competition.slug} />}>
            <TeamDetails competition={competition} teamId={teamId} allFixtures={allFixtures}
              liveFixtures={liveFixtures} squadPromise={squadPromise} standingsPromise={standingsPromise} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

/** Plantilla del equipo, agrupada por posición; cada jugador es tappable. */
function SquadList({ competition, squad }: { competition: Competition; squad: SquadPlayer[] }) {
  const POS_ES: Record<string, string> = {
    Goalkeeper: "Porteros",
    Defender: "Defensas",
    Midfielder: "Centrocampistas",
    Attacker: "Delanteros",
  };
  const order = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
  const groups = order
    .map((pos) => ({ pos, players: squad.filter((p) => p.position === pos) }))
    .filter((g) => g.players.length > 0);
  const others = squad.filter((p) => !order.includes(p.position ?? ""));
  if (others.length > 0) groups.push({ pos: "Otros", players: others });

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.pos}>
          <div className="shead">
            <h2>{POS_ES[g.pos] ?? "Otros"}</h2>
            <span className="sh-note">{g.players.length}</span>
          </div>
          <div className="panel" style={{ overflow: "hidden" }}>
            {g.players.map((p, i) => (
              <Link
                key={p.id}
                href={`/liga/${competition.slug}/jugador/${p.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderBottom:
                    i < g.players.length - 1 ? "1px solid var(--line)" : undefined,
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <span
                  className="mono tabular-nums"
                  style={{ width: 26, color: "var(--text-dim)", fontSize: "0.8rem" }}
                >
                  {p.number ?? "–"}
                </span>
                {p.photo ? (
                  <Image
                    src={p.photo}
                    alt=""
                    width={30}
                    height={30}
                    unoptimized
                    style={{ borderRadius: "50%", background: "var(--surface-2)" }}
                  />
                ) : (
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "var(--surface-2)",
                    }}
                  />
                )}
                <span style={{ fontWeight: 600, minWidth: 0 }} className="truncate">
                  {p.name}
                </span>
                {p.age != null && (
                  <span
                    className="mono"
                    style={{
                      marginLeft: "auto",
                      color: "var(--text-dim)",
                      fontSize: "0.72rem",
                    }}
                  >
                    {p.age} años
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


async function TeamSeason({
  statsPromise,
  partidos,
  teamId,
}: {
  statsPromise: Promise<TeamSeasonStats | null>;
  partidos: Fixture[];
  teamId: number;
}) {
  const stats = await statsPromise;
  if (!stats) return null;
  const alDia = perfilAlDia(stats, partidos, teamId);
  return <TeamStats stats={alDia.stats} minutosHasta={alDia.minutosHasta} />;
}

async function TeamCoach({ coachPromise }: { coachPromise: Promise<Coach | null> }) {
  const coach = await coachPromise;
  return (
    coach ? (
      <p
        className="phero__lede"
        style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}
      >
        {coach.photo && (
          <Image
            src={coach.photo}
            alt=""
            width={24}
            height={24}
            unoptimized
            style={{ borderRadius: "50%", background: "var(--surface-2)" }}
          />
        )}
        <span>
          Entrenador: <b style={{ color: "var(--text)" }}>{coach.name}</b>
          {coach.nationality ? ` · ${coach.nationality}` : ""}
        </span>
      </p>
    ) : (
      <p className="phero__lede" style={{ marginTop: 6 }}>
        Historial de partidos — toca cualquiera para ver sus
        estadísticas.
      </p>
    )
  );
}


async function TeamFavorite({ teamId, team, competition, favorited }: {
  teamId: number; team: { name: string }; competition: Competition; favorited: Promise<boolean>;
}) {
  return (
    <FavoriteStar
      target={{
        kind: "team",
        id: teamId,
        name: team.name,
        homeCompetitionSlug: competition.slug,
      }}
      initialFavorited={await favorited}
    />
  );
}


async function TeamDetails({ competition, teamId, allFixtures, liveFixtures, squadPromise, standingsPromise }: {
  competition: Competition; teamId: number; allFixtures: Fixture[]; liveFixtures: Fixture[];
  squadPromise: Promise<SquadPlayer[]>; standingsPromise: Promise<StandingRow[] | null>;
}) {
  // getTeamSquad ya recupera la última plantilla válida. No reconsultamos
  // aquí las plantillas de toda la competición para rescatar un solo equipo.
  const [squadFinal, standings] = await Promise.all([squadPromise, standingsPromise]);
  return (
    <TeamTabs
      hasSquad={squadFinal.length > 0}
      jugadores={<SquadList competition={competition} squad={squadFinal} />}
      partidos={<TeamFixturesList fixtures={allFixtures} slug={competition.slug} />}
      clasificacion={
        standings && standings.length > 0 ? (
          <StandingsTableView
            // koStructure trae RegExp (bracket de eliminatorias) —
            // rompe la serialización Server→Client Component en las
            // competiciones que lo tienen (Champions/Europa/
            // Conference/Copa del Rey/FA Cup/Supercopa). Mismo
            // idioma que ya usan `/liga/[slug]/page.tsx`, `buscar` y
            // `comparar` al cruzar una Competition a un "use client".
            competition={{ ...competition, koStructure: undefined }}
            standings={standings}
            highlightTeamIds={[teamId]}
            liveFixtures={liveFixtures}
          />
        ) : undefined
      }
    />
  );
}

