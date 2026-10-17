import { unstable_cache } from "next/cache";
import { CANAL_YOUTUBE } from "./directo";
import { nombraEquipo } from "@/lib/sports/menciones";
export { apodos } from "@/lib/sports/menciones";

/**
 * Vídeos de Reinaldo en la ficha del partido (17-oct, pedido del dueño):
 * automáticos, sin subir nada a mano. El feed RSS público del canal (los 15
 * últimos, sin API ni cuota) se lee con caché de 1 h y cada vídeo se asigna
 * al partido si se publicó cerca (36 h antes – 48 h después del inicio) y su
 * título nombra a uno de los dos equipos (con sus apodos).
 */

export type Video = { id: string; titulo: string; publicado: string };

const desescapar = (t: string) =>
  t
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

export function leerFeed(xml: string): Video[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, e]) => ({
      id: e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1] ?? "",
      titulo: desescapar(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      publicado: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? "",
    }))
    .filter((v) => v.id && v.publicado);
}

export const getVideosCanal = unstable_cache(
  async (): Promise<Video[]> => {
    try {
      const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CANAL_YOUTUBE}`, {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      if (!r.ok) return [];
      return leerFeed(await r.text());
    } catch {
      return [];
    }
  },
  ["videos-canal-youtube"],
  { revalidate: 3600 },
);

const ANTES_MS = 36 * 3_600_000;
const DESPUES_MS = 48 * 3_600_000;

export function videosDelPartido(
  videos: Video[],
  p: { local: string; visitante: string; inicio: string },
  max = 2,
): Video[] {
  const inicio = Date.parse(p.inicio);
  return videos
    .filter((v) => {
      const t = Date.parse(v.publicado);
      return t >= inicio - ANTES_MS && t <= inicio + DESPUES_MS && (nombraEquipo(v.titulo, p.local) || nombraEquipo(v.titulo, p.visitante));
    })
    .sort((a, b) => {
      // Primero los de después del partido (la reacción), del más cercano al inicio.
      const ta = Date.parse(a.publicado);
      const tb = Date.parse(b.publicado);
      const da = ta >= inicio ? 0 : 1;
      const db = tb >= inicio ? 0 : 1;
      return da - db || Math.abs(ta - inicio) - Math.abs(tb - inicio);
    })
    .slice(0, max);
}
