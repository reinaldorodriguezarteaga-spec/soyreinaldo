import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeamFixtures,
  isFinal,
  isLive,
  type Fixture,
} from "@/lib/sports/api-football";

export const metadata = {
  title: "Equipo | Mundial 2026 | Soy Reinaldo",
};

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

  const { team, recent, upcoming } = await getTeamFixtures(teamId, {
    last: 20,
    next: 5,
  });

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
      </section>
    </main>
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
