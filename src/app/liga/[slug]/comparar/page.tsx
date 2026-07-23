import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTeamStatistics,
  getCompetitionStandings,
  type StandingRow,
  type TeamSeasonStats,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import TeamPicker from "./team-picker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  return {
    title: `Comparador de equipos · ${competition.name} | Soy Reinaldo`,
    description: `Compara dos equipos de ${competition.name} lado a lado: goles, vallas invictas, forma, formación y más.`,
  };
}

type TeamLite = { id: number; name: string; logo: string };

async function teamList(competition: Competition): Promise<TeamLite[]> {
  try {
    const standings = (await getCompetitionStandings(competition)) as StandingRow[] | null;
    const byId = new Map<number, TeamLite>();
    for (const r of standings ?? [])
      if (!byId.has(r.team.id))
        byId.set(r.team.id, { id: r.team.id, name: r.team.name, logo: r.team.logo });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function num(v: string | undefined): number | null {
  return v ? Number(v) : null;
}

export default async function LigaCompararPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { slug } = await params;
  const competition: Competition | undefined = COMPETITIONS_BY_SLUG[slug];
  if (!competition) notFound();

  const { a: aRaw, b: bRaw } = await searchParams;
  const a = num(aRaw);
  const b = num(bRaw);

  const teams = await teamList(competition);

  const statOpts = { league: competition.leagueId, season: competition.season };
  const [statsA, statsB] = await Promise.all([
    a ? getTeamStatistics(a, statOpts).catch(() => null) : Promise.resolve(null),
    b ? getTeamStatistics(b, statOpts).catch(() => null) : Promise.resolve(null),
  ]);

  const teamA = teams.find((t) => t.id === a) ?? null;
  const teamB = teams.find((t) => t.id === b) ?? null;

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 16 }}>
        <div className="wrap">
          <Link
            href={`/liga/${competition.slug}?v=stats`}
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Estadísticas
          </Link>
          <h1
            className="phero__title"
            style={{ fontSize: "clamp(2rem,6vw,3.4rem)", margin: "12px 0 6px" }}
          >
            Comparador<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Elige dos equipos y compáralos en {competition.name}.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="panel" style={{ padding: "18px 20px", marginBottom: 24 }}>
            <TeamPicker competition={competition} teams={teams} a={a} b={b} />
          </div>

          {statsA && statsB && teamA && teamB ? (
            <Comparison a={statsA} b={statsB} teamA={teamA} teamB={teamB} />
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
              {a && !statsA
                ? "No hay estadísticas de la temporada para el equipo A todavía."
                : b && !statsB
                  ? "No hay estadísticas de la temporada para el equipo B todavía."
                  : "Elige dos equipos arriba para ver la comparación."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* ---------- Comparación ---------- */

function FormDots({ form }: { form: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    W: { bg: "#4ade80", fg: "#0a1030", label: "V" },
    D: { bg: "var(--line-strong)", fg: "var(--text)", label: "E" },
    L: { bg: "#ff8a8a", fg: "#0a1030", label: "D" },
  };
  const chars = form.replace(/[^WDL]/g, "").slice(-5).split("");
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {chars.map((c, i) => {
        const s = map[c] ?? { bg: "var(--line-strong)", fg: "var(--text)", label: c };
        return (
          <span
            key={i}
            style={{
              width: 15,
              height: 15,
              borderRadius: 3,
              background: s.bg,
              color: s.fg,
              fontSize: "0.54rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {s.label}
          </span>
        );
      })}
    </span>
  );
}

type Row = {
  label: string;
  a: number | string;
  b: number | string;
  better?: "max" | "min";
};

function Comparison({
  a,
  b,
  teamA,
  teamB,
}: {
  a: TeamSeasonStats;
  b: TeamSeasonStats;
  teamA: TeamLite;
  teamB: TeamLite;
}) {
  const rows: Row[] = [
    { label: "Jugados", a: a.fixtures.played.total, b: b.fixtures.played.total },
    {
      label: "Victorias",
      a: a.fixtures.wins.total,
      b: b.fixtures.wins.total,
      better: "max",
    },
    {
      label: "Goles a favor",
      a: a.goals.for.total.total ?? 0,
      b: b.goals.for.total.total ?? 0,
      better: "max",
    },
    {
      label: "Goles en contra",
      a: a.goals.against.total.total ?? 0,
      b: b.goals.against.total.total ?? 0,
      better: "min",
    },
    {
      label: "Vallas invictas",
      a: a.clean_sheet.total,
      b: b.clean_sheet.total,
      better: "max",
    },
    {
      label: "Partidos sin marcar",
      a: a.failed_to_score.total,
      b: b.failed_to_score.total,
      better: "min",
    },
    {
      label: "Racha de victorias",
      a: a.biggest.streak.wins,
      b: b.biggest.streak.wins,
      better: "max",
    },
    {
      label: "Formación",
      a: a.lineups?.[0]?.formation ?? "—",
      b: b.lineups?.[0]?.formation ?? "—",
    },
  ];

  const winner = (r: Row): "a" | "b" | null => {
    if (!r.better || typeof r.a !== "number" || typeof r.b !== "number") return null;
    if (r.a === r.b) return null;
    const aWins = r.better === "max" ? r.a > r.b : r.a < r.b;
    return aWins ? "a" : "b";
  };

  return (
    <div className="panel" style={{ padding: "6px 0", overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "14px 16px",
          borderBottom: "1px solid var(--line)",
          gap: 8,
        }}
      >
        <TeamHead team={teamA} align="left" form={a.form} />
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
          VS
        </span>
        <TeamHead team={teamB} align="right" form={b.form} />
      </div>

      {rows.map((r, i) => {
        const w = winner(r);
        return (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              padding: "11px 16px",
              gap: 8,
              borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : undefined,
            }}
          >
            <b
              className="tabular-nums"
              style={{
                textAlign: "left",
                fontSize: "1.05rem",
                color: w === "a" ? "var(--accent)" : "var(--text)",
              }}
            >
              {r.a}
            </b>
            <span
              className="mono"
              style={{
                color: "var(--text-dim)",
                fontSize: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {r.label}
            </span>
            <b
              className="tabular-nums"
              style={{
                textAlign: "right",
                fontSize: "1.05rem",
                color: w === "b" ? "var(--accent)" : "var(--text)",
              }}
            >
              {r.b}
            </b>
          </div>
        );
      })}
    </div>
  );
}

function TeamHead({
  team,
  align,
  form,
}: {
  team: TeamLite;
  align: "left" | "right";
  form: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "right" ? "flex-end" : "flex-start",
        gap: 6,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexDirection: align === "right" ? "row-reverse" : "row",
        }}
      >
        <Image src={team.logo} alt="" width={26} height={26} unoptimized />
        <b style={{ fontSize: "0.95rem" }}>{team.name}</b>
      </span>
      {form && <FormDots form={form} />}
    </div>
  );
}
