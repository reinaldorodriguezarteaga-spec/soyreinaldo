import type { Metadata } from "next";
import UniversalSearch from "./universal-search";

export const metadata: Metadata = {
  title: "Buscar | Soy Reinaldo",
  description:
    "Busca cualquier equipo o jugador del fútbol mundial: LaLiga, Premier, Serie A, Ligue 1, Champions y más.",
  alternates: { canonical: "/buscar" },
};

/**
 * Buscador universal del sitio. El de /liga/[slug]/buscar sigue existiendo
 * (busca dentro de esa competición); este no está atado a ninguna.
 */
export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 12 }}>
        <div className="wrap">
          <p className="eyebrow">Todo el fútbol</p>
          <h1
            className="phero__title"
            style={{ fontSize: "clamp(2rem,6vw,3.4rem)", margin: "12px 0 6px" }}
          >
            Buscar<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Cualquier equipo o jugador, de cualquier liga.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <UniversalSearch inicial={typeof q === "string" ? q : ""} />
        </div>
      </section>
    </main>
  );
}
