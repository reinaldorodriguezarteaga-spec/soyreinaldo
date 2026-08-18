import { unstable_cache } from "next/cache";

/**
 * Titulares de fútbol vía Google News RSS (gratis, sin clave, en español)
 * para el rail "Noticias" de la portada. Solo título + enlace + medio +
 * fecha — el clic lleva al medio original. Caché de 15 min: es un feed de
 * titulares, no hace falta más frescura ni martillear a Google.
 */

export type NewsItem = {
  title: string;
  link: string;
  source: string | null;
  /** ISO — para pintar "hace Xh". */
  publishedAt: string | null;
};

const QUERY =
  'LaLiga OR "Champions League" OR "FC Barcelona" OR "Real Madrid" OR fichajes';

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export const getFootballNews = unstable_cache(
  async (): Promise<NewsItem[]> => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=es&gl=ES&ceid=ES:es`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const xml = await res.text();

      const items: NewsItem[] = [];
      for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const block = m[1];
        const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
        const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
        const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
        const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1];

        // Google añade " - Medio" al final del titular; el medio ya va aparte.
        const title = decodeEntities(rawTitle).replace(/\s+-\s+[^-]+$/, "").trim();
        if (!title || !link) continue;

        items.push({
          title,
          link: decodeEntities(link).trim(),
          source: source ? decodeEntities(source).trim() : null,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
        });
        if (items.length >= 8) break;
      }
      return items;
    } catch {
      return [];
    }
  },
  ["football-news"],
  { revalidate: 900 },
);
