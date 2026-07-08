import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  getTeamStatistics,
  getWorldCupStandings,
  type TeamSeasonStats,
} from "@/lib/sports/api-football";
import TeamPicker from "./team-picker";

export const metadata: Metadata = {
  title: "Comparador de selecciones · Mundial 2026 | Soy Reinaldo",
  description:
    "Compara dos selecciones del Mundial 2026 lado a lado: goles, vallas invictas, forma, formación y más.",
};

type TeamLite = { id: number; name: string; logo: string };

/** Lista de selecciones (de la clasificación de grupos), sin repetir, por nombre. */
async function teamList(): Promise<TeamLite[]> {
  try {
    const groups = await getWorldCupStandings();
    const byId = new Map<number, TeamLite>();
    for (const g of groups)
      for (const r of g.rows)
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

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a: aRaw, b: bRaw } = await searchParams;
  const a = num(aRaw);
  const b = num(bRaw);

  const teams = await teamList();

  const [statsA, statsB] = await Promise.all([
    a ? getTeamStatistics(a).catch(() => null) : Promise.resolve(null),
    b ? getTeamStatistics(b).catch(() => null) : Promise.resolve(null),
  ]);

  const teamA = teams.find((t) => t.id === a) ?? null;
  const teamB = teams.find((t) => t.id === b) ?? null;

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 16 }}>
        <div className="wrap">
          <Link
            href="/mundial?v=stats"
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
            Elige dos selecciones y compáralas en el Mundial 2026.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="panel" style={{ padding: "18px 20px", marginBottom: 24 }}>
            <TeamPicker teams={teams} a={a} b={b} />
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
                ? "No hay estadísticas del torneo para la selección A todavía."
                : b && !statsB
                  ? "No hay estadísticas del torneo para la selección B todavía."
                  : "Elige dos selecciones arriba para ver la comparación."}
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
  /** Qué lado es "mejor" para resaltar: mayor, menor o ninguno. */
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
