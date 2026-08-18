import { getFootballNews } from "@/lib/football-news";

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/** Rail "Noticias" de la portada (escritorio): titulares de Google News RSS
 * con enlace al medio original. Si el feed falla, no se pinta nada. */
export default async function NewsCard() {
  const items = await getFootballNews();
  if (items.length === 0) return null;

  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <div style={{ padding: "14px 16px" }}>
        <b
          className="mono"
          style={{ fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Noticias
        </b>
      </div>
      <div style={{ borderTop: "1px solid var(--line)" }}>
        {items.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="newsitem"
          >
            <span className="newsitem__title">{n.title}</span>
            <span className="newsitem__meta">
              {n.source ?? "Noticias"}
              {timeAgo(n.publishedAt) ? ` · ${timeAgo(n.publishedAt)}` : ""}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
