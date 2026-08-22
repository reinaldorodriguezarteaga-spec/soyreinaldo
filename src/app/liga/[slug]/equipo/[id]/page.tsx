import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeamCoach,
  getTeamFixtures,
  getAllCompetitionPlayers,
  getTeamSquad,
  getTeamStatistics,
  type Coach,
  type SquadPlayer,
} from "@/lib/sports/api-football";
import JsonLd, { absolute } from "@/lib/seo/json-ld";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import { isFavorited } from "@/app/actions/favorites";
import FavoriteStar from "@/components/FavoriteStar";
import TeamStats from "./team-stats";
import TeamTabs from "./team-tabs";
import TeamFixturesList from "./fixtures-list";
import TeamOverview from "./team-overview";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  const { team } = await getTeamFixtures(Number(id), { last: 1, next: 0 }).catch(
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

  const [{ team, recent, upcoming }, stats, squad, coach] = await Promise.all([
    getTeamFixtures(teamId, { last: 40, next: 40 }),
    getTeamStatistics(teamId, { league: competition.leagueId, season: competition.season }).catch(
      () => null,
    ),
    getTeamSquad(teamId).catch(() => [] as SquadPlayer[]),
    getTeamCoach(teamId).catch(() => null as Coach | null),
  ]);

  if (!team && recent.length === 0 && upcoming.length === 0) notFound();

  // Respaldo de la plantilla.
  //
  // La ficha lanza cinco llamadas a la vez y `/players/squads` es la que más
  // se cae de la ráfaga: API-Football contesta con su límite por minuto y la
  // pestaña "Jugadores" desaparecía según la visita — aparecía y se iba sin
  // que nadie tocara nada.
  //
  // El listado de toda la competición pide esas mismas plantillas pero en
  // lotes pequeños y con pausas, así que sí las consigue, y queda cacheado.
  // Si la llamada directa vuelve vacía, se saca de ahí. Se pierden el dorsal
  // y la edad, que ese listado no guarda; se gana que la pestaña esté
  // siempre.
  const squadFinal: SquadPlayer[] =
    squad.length > 0
      ? squad
      : await getAllCompetitionPlayers(competition)
          .then((todos) =>
            todos
              .filter((p) => p.teamId === teamId)
              .map((p) => ({
                id: p.id,
                name: p.name,
                photo: p.photo,
                number: null,
                position: p.position,
                age: null,
              })),
          )
          .catch(() => [] as SquadPlayer[]);

  const favorited = await isFavorited("team", String(teamId));

  // Historial + calendario en una sola lista cronológica ascendente (FotMob).
  const seenIds = new Set<number>();
  const allFixtures = [...recent, ...upcoming]
    .filter((f) => {
      if (seenIds.has(f.fixture.id)) return false;
      seenIds.add(f.fixture.id);
      return true;
    })
    .sort(
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
                  <FavoriteStar
                    target={{
                      kind: "team",
                      id: teamId,
                      name: team.name,
                      homeCompetitionSlug: competition.slug,
                    }}
                    initialFavorited={favorited}
                  />
                )}
              </div>
              {coach ? (
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
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap space-y-8">
          <TeamOverview fixtures={allFixtures} teamId={teamId} slug={competition.slug} />
          {stats && <TeamStats stats={stats} />}

          <TeamTabs
            hasSquad={squadFinal.length > 0}
            jugadores={<SquadList competition={competition} squad={squadFinal} />}
            partidos={<TeamFixturesList fixtures={allFixtures} slug={competition.slug} />}
          />
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

