import Link from "next/link";
import { porEquipo } from "@/lib/analisis/queries";
import { minutosDeLectura } from "@/lib/analisis/markdown";

/** Opinión propia junto al resumen del equipo; sin hueco cuando no hay análisis. */
export default async function TeamAnalisis({
  teamId, nombre, fixtureIds,
}: { teamId: number; nombre: string; fixtureIds: number[] }) {
  const articulos = await porEquipo(teamId, nombre, fixtureIds).catch(() => []);
  if (articulos.length === 0) return null;

  return (
    <section aria-label={`Análisis de ${nombre}`}>
      <div className="shead">
        <h2>El análisis de Reinaldo</h2>
        <Link href="/analisis" className="sh-note">Ver todos →</Link>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {articulos.map((a) => (
          <Link key={a.id} href={`/analisis/${a.slug}`} className="panel"
            style={{ padding: 20, display: "block", color: "inherit" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "1.2rem" }}>{a.title}</h3>
            {a.excerpt && <p style={{ margin: "0 0 10px", color: "var(--text-dim)" }}>{a.excerpt}</p>}
            <span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.12em", color: "var(--accent)" }}>
              LEER · {minutosDeLectura(a.body)} MIN <span className="arr">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
