import Link from "next/link";
import { listarPublicados } from "@/lib/analisis/queries";
import { minutosDeLectura } from "@/lib/analisis/markdown";

export const revalidate = 300;

export const metadata = {
  title: "Análisis | Soy Reinaldo",
  description:
    "Opinión y análisis de fútbol de Reinaldo Rodríguez: partidos, fichajes y actualidad culé.",
  alternates: { canonical: "/analisis" },
};

function fecha(iso: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

export default async function AnalisisIndex() {
  const articulos = await listarPublicados();

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <p className="eyebrow">Opinión</p>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,4rem)", marginTop: 12 }}>
            Análisis
          </h1>
          <p className="phero__lede" style={{ marginTop: 8 }}>
            Lo que pienso de lo que pasa en el campo. Sin prisa y sin titular
            fácil.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          {articulos.length === 0 ? (
            <div
              className="panel"
              style={{ padding: 32, textAlign: "center", borderStyle: "dashed", color: "var(--text-dim)" }}
            >
              Todavía no hay nada publicado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {articulos.map((a) => (
                <Link
                  key={a.id}
                  href={`/analisis/${a.slug}`}
                  className="panel"
                  style={{ padding: 22, display: "block", color: "inherit" }}
                >
                  <p
                    className="mono"
                    style={{ fontSize: "0.66rem", letterSpacing: "0.12em", color: "var(--text-dim)", margin: 0 }}
                  >
                    {a.published_at ? fecha(a.published_at).toUpperCase() : ""} ·{" "}
                    {minutosDeLectura(a.body)} MIN
                  </p>
                  <h2 style={{ margin: "8px 0 6px", fontSize: "1.35rem" }}>{a.title}</h2>
                  {a.excerpt && (
                    <p style={{ margin: 0, color: "var(--text-dim)" }}>{a.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
