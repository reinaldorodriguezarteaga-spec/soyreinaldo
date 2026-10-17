import { getVideosCanal, videosDelPartido } from "@/lib/youtube/videos";
import VideoLite from "@/components/VideoLite";

/**
 * "🎥 Reinaldo habla del partido" (17-oct, pedido del dueño): sus vídeos de
 * YouTube publicados alrededor del partido que nombran a uno de los equipos.
 * Automático desde el feed del canal (lib/youtube/videos.ts).
 */
export default async function MatchVideos({
  local,
  visitante,
  inicio,
}: {
  local: string;
  visitante: string;
  inicio: string;
}) {
  const videos = videosDelPartido(await getVideosCanal(), { local, visitante, inicio });
  if (videos.length === 0) return null;
  // schema.org/VideoObject: Google puede enseñar el vídeo en la búsqueda del
  // partido (contenido propio de la ficha, no solo datos de la API).
  const jsonLd = videos.map((v) => ({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.titulo,
    description: `${v.titulo} — Reinaldo Rodríguez (@SoyReinaldoR) sobre ${local} – ${visitante}.`,
    thumbnailUrl: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    uploadDate: v.publicado,
    embedUrl: `https://www.youtube.com/embed/${v.id}`,
    contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
  }));
  return (
    <div style={{ marginTop: 28 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="shead">
        <h2>🎥 Reinaldo habla del partido</h2>
        <span className="sh-note">en YouTube</span>
      </div>
      <div className="videos">
        {videos.map((v) => (
          <VideoLite key={v.id} id={v.id} titulo={v.titulo} />
        ))}
      </div>
    </div>
  );
}
