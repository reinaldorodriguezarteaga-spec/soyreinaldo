import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompetitionAllFixtures,
  isFinal,
  isLive,
  competitionBracket,
  type BracketRound,
  type Fixture,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  return {
    title: `Cuadro de eliminatorias · ${competition.name} | Soy Reinaldo`,
    description: `El cuadro de eliminatorias de ${competition.name}.`,
  };
}

export const revalidate = 60;

const MADRID_TZ = "Europe/Madrid";

function shortWhen(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .toUpperCase();
}

export default async function LigaBracketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competition: Competition | undefined = COMPETITIONS_BY_SLUG[slug];
  if (!competition) notFound();

  const hero = (
    <section className="phero" style={{ paddingBottom: 12 }}>
      <div className="wrap">
        <Link
          href={`/liga/${competition.slug}`}
          className="eyebrow"
          style={{ display: "inline-block", color: "var(--accent)" }}
        >
          ← {competition.name}
        </Link>
        <h1
          className="phero__title"
          style={{ fontSize: "clamp(2rem,6vw,3.4rem)", margin: "12px 0 6px" }}
        >
          Eliminatorias<span className="dot">.</span>
        </h1>
        <p className="phero__lede">El cuadro de eliminatorias de {competition.name}.</p>
      </div>
    </section>
  );

  // Competiciones de liga regular (LaLiga hoy) no tienen fase de eliminatorias
  // — se muestra un estado explicativo en vez de un cuadro vacío o un error.
  if (!competition.koStructure) {
    return (
      <main className="page">
        {hero}
        <section className="section" style={{ paddingTop: 12 }}>
          <div className="wrap">
            <div
              className="panel"
              style={{
                padding: 28,
                textAlign: "center",
                borderStyle: "dashed",
                color: "var(--text-dim)",
              }}
            >
              Esta competición no tiene fase de eliminatorias — {competition.name} se
              decide por tabla de clasificación durante toda la temporada.
            </div>
          </div>
        </section>
      </main>
    );
  }

  let rounds: BracketRound[] = [];
  try {
    rounds = competitionBracket(
      await getCompetitionAllFixtures(competition),
      competition.koStructure,
    );
  } catch {
    rounds = [];
  }

  const hasAny = rounds.some((r) => r.fixtures.length > 0);

  return (
    <main className="page">
      {hero}
      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap">
          {!hasAny ? (
            <div
              className="panel"
              style={{
                padding: 28,
                textAlign: "center",
                borderStyle: "dashed",
                color: "var(--text-dim)",
              }}
            >
              Las eliminatorias arrancan más adelante en la temporada.
            </div>
          ) : (
            <div style={{ overflowX: "auto", paddingBottom: 12 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "stretch", minWidth: "min-content" }}>
                {rounds.map((r) => (
                  <RoundColumn key={r.label} competition={competition} round={r} />
                ))}
              </div>
            </div>
          )}
          <p className="mono" style={{ color: "var(--text-dim)", fontSize: "0.62rem", marginTop: 14 }}>
            Desliza para ver todas las rondas. Toca un cruce para su detalle.
          </p>
        </div>
      </section>
    </main>
  );
}

function RoundColumn({ competition, round }: { competition: Competition; round: BracketRound }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        gap: 12,
        width: 210,
        flex: "0 0 auto",
      }}
    >
      <div
        className="mono"
        style={{
          textAlign: "center",
          color: "var(--accent)",
          fontSize: "0.64rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 700,
          position: "sticky",
          top: 0,
        }}
      >
        {round.label}
      </div>
      {round.fixtures.length > 0
        ? round.fixtures.map((fx) => (
            <BracketMatch key={fx.fixture.id} competition={competition} fx={fx} />
          ))
        : Array.from({ length: round.placeholders }).map((_, i) => (
            <PlaceholderMatch key={i} />
          ))}
    </div>
  );
}

function Side({ team, score, dim, played }: {
  team: { name: string; logo: string; winner: boolean | null };
  score: number | null;
  dim: boolean;
  played: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
      <Image src={team.logo} alt="" width={18} height={18} unoptimized style={{ flexShrink: 0 }} />
      <span
        className="truncate"
        style={{
          flex: 1,
          fontSize: "0.82rem",
          fontWeight: team.winner ? 700 : 500,
          color: dim ? "var(--text-dim)" : "var(--text)",
        }}
      >
        {team.name}
      </span>
      {played && (
        <b className="tabular-nums" style={{ fontSize: "0.9rem", color: dim ? "var(--text-dim)" : "var(--text)" }}>
          {score ?? 0}
        </b>
      )}
    </div>
  );
}

function BracketMatch({ competition, fx }: { competition: Competition; fx: Fixture }) {
  const live = isLive(fx);
  const final = isFinal(fx);
  const played = live || final;
  const { home, away } = fx.teams;

  return (
    <Link
      href={`/liga/${competition.slug}/partido/${fx.fixture.id}`}
      className="panel"
      style={{
        display: "block",
        padding: "9px 11px",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        {live ? (
          <span className="badge badge--danger" style={{ fontSize: "0.58rem" }}>
            <span className="livepulse" />
            {fx.fixture.status.short === "HT"
              ? "DESC"
              : fx.fixture.status.elapsed != null
                ? `${fx.fixture.status.elapsed}'`
                : "VIVO"}
          </span>
        ) : final ? (
          <span className="mono" style={{ fontSize: "0.56rem", color: "var(--text-dim)" }}>
            {fx.fixture.status.short === "PEN" ? "PENALTIS" : "FINAL"}
          </span>
        ) : (
          <span className="mono" style={{ fontSize: "0.56rem", color: "var(--text-dim)" }}>
            {shortWhen(fx.fixture.date)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Side team={home} score={fx.goals.home} played={played} dim={final && home.winner === false} />
        <Side team={away} score={fx.goals.away} played={played} dim={final && away.winner === false} />
      </div>
    </Link>
  );
}

function PlaceholderMatch() {
  const row = (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--surface-2)", flexShrink: 0 }} />
      <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>Por definir</span>
    </div>
  );
  return (
    <div
      className="panel"
      style={{ padding: "9px 11px", borderStyle: "dashed", opacity: 0.7 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {row}
        {row}
      </div>
    </div>
  );
}
