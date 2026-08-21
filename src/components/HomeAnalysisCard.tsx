import Link from "next/link";
import { listarPublicados } from "@/lib/analisis/queries";
import { minutosDeLectura } from "@/lib/analisis/markdown";

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/**
 * Cuadro "Análisis" de la portada (columna central, debajo del calendario —
 * pedido del dueño 21-ago: escribió el primero y no había ningún sitio en
 * la portada donde verlo). Últimos artículos publicados; si no hay ninguno,
 * no se pinta nada. Reutiliza el estilo de fila de NewsCard (.newsitem).
 */
export default async function HomeAnalysisCard() {
  const articulos = await listarPublicados(3);
  if (articulos.length === 0) return null;

  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
        }}
      >
        <b
          className="mono"
          style={{ flex: 1, minWidth: 0, fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Análisis
        </b>
        <Link
          href="/analisis"
          className="mono"
          style={{ color: "var(--accent)", fontSize: "0.66rem", letterSpacing: "0.1em", textDecoration: "none" }}
        >
          VER TODOS →
        </Link>
      </div>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {articulos.map((a) => (
          <Link key={a.id} href={`/analisis/${a.slug}`} className="newsitem">
            <span className="newsitem__title">{a.title}</span>
            <span className="newsitem__meta">
              {a.published_at ? fechaCorta(a.published_at) : ""} ·{" "}
              {minutosDeLectura(a.body)} min de lectura
              {a.excerpt ? ` — ${a.excerpt}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
