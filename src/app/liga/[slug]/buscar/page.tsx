import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompetitionStandings, type StandingRow } from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import SearchBox from "./search-box";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  return {
    title: `Buscar · ${competition.name} | Soy Reinaldo`,
    description: `Busca cualquier equipo o jugador de ${competition.name}.`,
  };
}

type Team = { id: number; name: string; logo: string };

async function teamList(competition: Competition): Promise<Team[]> {
  try {
    const standings = (await getCompetitionStandings(competition)) as StandingRow[] | null;
    const byId = new Map<number, Team>();
    for (const r of standings ?? [])
      if (!byId.has(r.team.id))
        byId.set(r.team.id, { id: r.team.id, name: r.team.name, logo: r.team.logo });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export default async function LigaBuscarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competition: Competition | undefined = COMPETITIONS_BY_SLUG[slug];
  if (!competition) notFound();

  const teams = await teamList(competition);

  return (
    <main className="page">
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
            Buscar<span className="dot">.</span>
          </h1>
          <p className="phero__lede">Encuentra cualquier equipo o jugador de {competition.name}.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <SearchBox competition={competition} teams={teams} />
        </div>
      </section>
    </main>
  );
}
