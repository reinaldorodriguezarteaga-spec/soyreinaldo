import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeamFixtures,
  getTeamSquad,
  getTeamStatistics,
  isFinal,
  isLive,
  type Fixture,
  type SquadPlayer,
} from "@/lib/sports/api-football";
import TeamStats from "./team-stats";
import TeamTabs from "./team-tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { team } = await getTeamFixtures(Number(id), { last: 1, next: 0 }).catch(
    () => ({ team: null }) as { team: null },
  );
  if (!team) return { title: "Selección · Mundial 2026 | Soy Reinaldo" };
  const title = `${team.name} · Historial · Mundial 2026`;
  const description = `Partidos, resultados y calendario de ${team.name} en el Mundial 2026.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

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

export default async function EquipoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) notFound();

  const [{ team, recent, upcoming }, stats, squad] = await Promise.all([
    getTeamFixtures(teamId, { last: 20, next: 5 }),
    getTeamStatistics(teamId).catch(() => null),
    getTeamSquad(teamId).catch(() => [] as SquadPlayer[]),
  ]);

  if (!team && recent.length === 0 && upcoming.length === 0) notFound();

  const live = recent.filter(isLive);
  const played = recent
    .filter((f) => isFinal(f))
    .sort(
      (a, b) =>
        new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime(),
    );

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <Link
            href="/mundial"
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Mundial
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
              <h1
                className="phero__title"
                style={{ fontSize: "clamp(2rem,6vw,3.4rem)", margin: 0 }}
              >
                {team?.name ?? "Selección"}
              </h1>
              <p className="phero__lede" style={{ marginTop: 6 }}>
                Historial de partidos — toca cualquiera para ver sus
                estadísticas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap space-y-8">
          {stats && <TeamStats stats={stats} />}

          <TeamTabs
            hasSquad={squad.length > 0}
            jugadores={<SquadList squad={squad} />}
            partidos={
              <div className="space-y-8">
          {live.length > 0 && (
            <div>
              <div className="shead">
                <h2>En juego</h2>
                <span className="sh-note">
                  <span className="livepulse" style={{ marginRight: 7 }} />
                  ahora mismo
                </span>
              </div>
              <div className="grid2">
                {live.map((fx) => (
                  <TeamMatchCard key={fx.fixture.id} fx={fx} teamId={teamId} />
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="shead">
                <h2>Próximos</h2>
              </div>
              <div className="grid2">
                {upcoming.map((fx) => (
                  <TeamMatchCard key={fx.fixture.id} fx={fx} teamId={teamId} />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="shead">
              <h2>Resultados</h2>
              {played.length > 0 && (
                <span className="sh-note">últimos partidos</span>
              )}
            </div>
            {played.length > 0 ? (
              <div className="grid2">
                {played.map((fx) => (
                  <TeamMatchCard key={fx.fixture.id} fx={fx} teamId={teamId} />
                ))}
              </div>
            ) : (
              <div
                className="panel"
                style={{
                  padding: 28,
                  textAlign: "center",
                  borderStyle: "dashed",
                  color: "var(--text-dim)",
                }}
              >
                Todavía no hay partidos jugados de esta selección.
              </div>
            )}
          </div>
              </div>
            }
          />
        </div>
      </section>
    </main>
  );
}

/** Plantilla de la selección, agrupada por posición; cada jugador es tappable. */
function SquadList({ squad }: { squad: SquadPlayer[] }) {
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
                href={`/mundial/jugador/${p.id}`}
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

/** Tarjeta de un partido del equipo, clicable a su detalle con estadísticas. */
function TeamMatchCard({ fx, teamId }: { fx: Fixture; teamId: number }) {
  const live = isLive(fx);
  const final = isFinal(fx);
  const showScore = live || final;
  const home = fx.teams.home;
  const away = fx.teams.away;

  return (
    <Link
      href={`/mundial/partido/${fx.fixture.id}`}
      className="match"
      style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
    >
      <div className="match__meta">
        <span className="match__grp">
          {fx.league.name}
          {fx.league.round ? ` · ${fx.league.round}` : ""}
        </span>
        {live ? (
          <span className="badge badge--danger">
            <span className="livepulse" />
            {fx.fixture.status.elapsed != null
              ? `${fx.fixture.status.elapsed}'`
              : "EN VIVO"}
          </span>
        ) : final ? (
          <span className="badge">Final</span>
        ) : (
          <span className="match__when">{formatKickoff(fx.fixture.date)}</span>
        )}
      </div>
      <div className="team">
        <span className="flag">
          <Image src={home.logo} alt="" width={20} height={20} unoptimized />
        </span>
        <span
          className="tn"
          style={{
            fontWeight: home.id === teamId ? 800 : undefined,
            color:
              final && home.winner === false ? "var(--text-dim)" : undefined,
          }}
        >
          {home.name}
        </span>
      </div>
      <div className="score">
        {showScore ? (
          <>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.4rem" }}>
              {fx.goals.home ?? 0}
            </b>
            <span className="vs">–</span>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.4rem" }}>
              {fx.goals.away ?? 0}
            </b>
          </>
        ) : (
          <span className="vs">VS</span>
        )}
      </div>
      <div className="team right">
        <span
          className="tn"
          style={{
            fontWeight: away.id === teamId ? 800 : undefined,
            color:
              final && away.winner === false ? "var(--text-dim)" : undefined,
          }}
        >
          {away.name}
        </span>
        <span className="flag">
          <Image src={away.logo} alt="" width={20} height={20} unoptimized />
        </span>
      </div>
      {showScore && (
        <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
          <span className="match__when">{formatKickoff(fx.fixture.date)}</span>
          <span className="match__when" style={{ color: "var(--accent)" }}>
            Ver estadísticas →
          </span>
        </div>
      )}
    </Link>
  );
}
