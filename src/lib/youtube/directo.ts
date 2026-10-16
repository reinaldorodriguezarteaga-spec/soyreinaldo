import { unstable_cache } from "next/cache";

/**
 * ¿Está Reinaldo en directo en YouTube? (16-oct, pedido del dueño: pill
 * "Reinaldo en directo" con reproductor). Sin API ni cuota: la página
 * `/channel/<id>/live` apunta (canonical) al vídeo cuando hay directo y
 * trae `"isLiveNow":true`; si no, apunta al canal. Un directo PROGRAMADO
 * también apunta al vídeo, pero sin isLiveNow: no cuenta.
 *
 * Caché de 60 s compartida por todo el que mire (una petición a YouTube por
 * minuto como mucho), con el try/catch DENTRO: si YouTube falla, "no hay
 * directo" y no se reintenta en bucle.
 */
export const CANAL_YOUTUBE = "UC0RK4l80AMXvWkTvDYnVKfA"; // @SoyReinaldoR

export type DirectoYoutube = { videoId: string; titulo: string } | null;

export function leerDirecto(html: string): DirectoYoutube {
  const canon = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  if (!canon || !/"isLive":true/.test(html) || /"isUpcoming":true/.test(html)) return null;
  const titulo = html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? "";
  return {
    videoId: canon[1],
    titulo: titulo
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  };
}

export const getDirectoYoutube = unstable_cache(
  async (): Promise<DirectoYoutube> => {
    try {
      const r = await fetch(`https://www.youtube.com/channel/${CANAL_YOUTUBE}/live`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9",
          // Sin esto, desde la UE (las funciones van en dub1) YouTube
          // devuelve la pantalla de consentimiento de cookies.
          Cookie: "SOCS=CAI",
        },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      if (!r.ok) return null;
      return leerDirecto(await r.text());
    } catch {
      return null;
    }
  },
  ["directo-youtube"],
  { revalidate: 60 },
);
