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
  return (
    <div style={{ marginTop: 28 }}>
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
