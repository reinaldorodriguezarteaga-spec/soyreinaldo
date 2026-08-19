import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Rutas "caras": cada render dispara varias llamadas a API-Football (la
 * ficha de jugador, 5-6; la de partido, hasta 7). Un crawler barriéndolas
 * agota la cuota diaria en horas — pasó el 5-jul, el 23-jul y el 19-ago
 * (19.133 fichas de jugador en 6h, ~117 req/min, IGNORANDO robots.txt, que
 * ya prohibía /partido/ y /equipo/ desde julio). robots.txt es solo para
 * bots educados; esto es la barrera real.
 */
const HEAVY_PATH_RE =
  /^\/(?:liga\/[^/]+|mundial)\/(?:jugador|partido|equipo|comparar)\//;

/** Bots de previsualización de enlaces (compartir un partido por WhatsApp/
 * Telegram/redes debe seguir generando su tarjetita). */
const PREVIEW_BOT_RE =
  /whatsapp|telegrambot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot/i;

/**
 * Crawlers/scrapers/librerías HTTP. Incluye a propósito a googlebot/bingbot
 * y a los bots de IA: estas rutas están (ahora todas) en Disallow de
 * robots.txt, así que un buscador legítimo jamás las pide — quien llegue
 * aquí con ese User-Agent o lo está falseando o está ignorando robots.txt.
 * El SEO no se toca: estas páginas nunca se indexaron por diseño.
 */
const BAD_BOT_RE =
  /bot|crawl|spider|scrap|slurp|python|aiohttp|httpx|requests|curl|wget|libwww|okhttp|go-http|node-fetch|axios|scrapy|headless|phantom|puppeteer|playwright|selenium|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|amazonbot|ccbot|gptbot|claude|perplexity|yandex/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (HEAVY_PATH_RE.test(pathname)) {
    const ua = request.headers.get("user-agent") ?? "";
    const isPreviewBot = PREVIEW_BOT_RE.test(ua);
    const looksBot = ua.length === 0 || BAD_BOT_RE.test(ua);
    if (looksBot && !isPreviewBot) {
      // 403 seco y barato: sin render, sin llamadas a API-Football ni a
      // Supabase (updateSession ni se ejecuta).
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluimos webhooks (server-to-server, sin cookies) y assets estáticos.
    "/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
