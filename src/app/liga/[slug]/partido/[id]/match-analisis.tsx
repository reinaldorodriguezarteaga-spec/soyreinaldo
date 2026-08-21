import Link from "next/link";
import { porPartido } from "@/lib/analisis/queries";
import { minutosDeLectura } from "@/lib/analisis/markdown";

/**
 * El análisis de Reinaldo sobre ESTE partido, dentro de su ficha.
 *
 * Es el motivo por el que alguien elegiría esta web en vez de FotMob: los
 * datos son los mismos en todas partes, la opinión no. Va lo primero, por
 * encima de la quiniela y de las estadísticas, porque es lo único que solo
 * está aquí.
 */
export default async function MatchAnalisis({ fixtureId }: { fixtureId: number }) {
  const articulos = await porPartido(fixtureId).catch(() => []);
  if (articulos.length === 0) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2>✍️ El análisis</h2>
        <span className="sh-note">de Reinaldo</span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {articulos.map((a) => (
          <Link
            key={a.id}
            href={`/analisis/${a.slug}`}
            className="panel"
            style={{ padding: 20, display: "block", color: "inherit" }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: "1.2rem" }}>{a.title}</h3>
            {a.excerpt && (
              <p style={{ margin: "0 0 10px", color: "var(--text-dim)" }}>{a.excerpt}</p>
            )}
            <span className="mono" style={{ fontSize: "0.66rem", letterSpacing: "0.12em", color: "var(--accent)" }}>
              LEER · {minutosDeLectura(a.body)} MIN <span className="arr">→</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
