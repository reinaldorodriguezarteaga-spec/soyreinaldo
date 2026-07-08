import type { Metadata } from "next";
import Link from "next/link";
import { getWorldCupStandings } from "@/lib/sports/api-football";
import SearchBox from "./search-box";

export const metadata: Metadata = {
  title: "Buscar · Mundial 2026 | Soy Reinaldo",
  description: "Busca cualquier selección o jugador del Mundial 2026.",
};

type Team = { id: number; name: string; logo: string };

async function teamList(): Promise<Team[]> {
  try {
    const groups = await getWorldCupStandings();
    const byId = new Map<number, Team>();
    for (const g of groups)
      for (const r of g.rows)
        if (!byId.has(r.team.id))
          byId.set(r.team.id, { id: r.team.id, name: r.team.name, logo: r.team.logo });
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export default async function BuscarPage() {
  const teams = await teamList();

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 12 }}>
        <div className="wrap">
          <Link
            href="/mundial"
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Mundial
          </Link>
          <h1
            className="phero__title"
            style={{ fontSize: "clamp(2rem,6vw,3.4rem)", margin: "12px 0 6px" }}
          >
            Buscar<span className="dot">.</span>
          </h1>
          <p className="phero__lede">Encuentra cualquier selección o jugador del Mundial.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <SearchBox teams={teams} />
        </div>
      </section>
    </main>
  );
}
