import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * ============ Escudo anti-scraping de las rutas caras ============
 *
 * Cada ficha de jugador dispara 5-6 llamadas a API-Football y cada ficha
 * de partido hasta 7. Un crawler barriéndolas agota la cuota diaria en
 * horas — pasó el 5-jul, el 23-jul y el 19-ago (19.133 fichas de jugador
 * en 6h a ~117 req/min, ignorando robots.txt Y falseando User-Agent de
 * navegador). Tres capas, todas resueltas EN EL BORDE (cero coste de
 * API-Football/Supabase para lo bloqueado):
 *
 *  1. UA de crawler/librería (o vacío) → 403 directo.
 *  2. Desafío de cookie: la primera visita recibe un 302 a la misma URL
 *     con Set-Cookie; un navegador real lo sigue con la cookie sin que el
 *     usuario note nada, un scraper sin tarro de cookies vuelve sin ella
 *     y recibe 403. Los usuarios con sesión (cookies sb-*) ni lo ven.
 *  3. Límite por IP (best-effort, memoria del edge): nadie humano abre
 *     >40 fichas por minuto.
 *
 * robots.txt ya prohíbe estas rutas (SEO intacto: nunca se indexaron por
 * diseño) — esto es para los bots que lo ignoran.
 */
const HEAVY_PATH_RE =
  /^\/(?:liga\/[^/]+|mundial)\/(?:jugador|partido|equipo|comparar)\//;

/** Bots de previsualización de enlaces (compartir un partido por WhatsApp/
 * Telegram/redes debe seguir generando su tarjetita). */
const PREVIEW_BOT_RE =
  /whatsapp|telegrambot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot/i;

/** Crawlers/scrapers/librerías HTTP. Incluye a googlebot/bingbot/bots de IA
 * a propósito: estas rutas están en Disallow de robots.txt, así que quien
 * llegue con ese UA o lo falsea o ignora robots.txt. */
const BAD_BOT_RE =
  /bot|crawl|spider|scrap|slurp|python|aiohttp|httpx|requests|curl|wget|libwww|okhttp|go-http|node-fetch|axios|scrapy|headless|phantom|puppeteer|playwright|selenium|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|amazonbot|ccbot|gptbot|claude|perplexity|yandex/i;

const CHALLENGE_COOKIE = "sr_ok";
const CHALLENGE_PARAM = "_c";

/** Límite por IP: ventana fija de 60s. Estado en memoria del edge —
 * best-effort (cada instancia cuenta lo suyo), pero un crawler desde un
 * datacenter concentra sus hits y le corta igual. */
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { n: number; t: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now - cur.t > RATE_WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    // Poda ocasional para que el Map no crezca sin límite.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (now - v.t > RATE_WINDOW_MS) hits.delete(k);
      }
    }
    return false;
  }
  cur.n++;
  return cur.n > RATE_LIMIT;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (HEAVY_PATH_RE.test(pathname)) {
    const ua = request.headers.get("user-agent") ?? "";

    // Capa 0: bots de previsualización de enlaces pasan siempre.
    if (!PREVIEW_BOT_RE.test(ua)) {
      // Capa 1: UA de crawler/librería o vacío.
      if (ua.length === 0 || BAD_BOT_RE.test(ua)) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      // Capa 3 (antes que la 2 para cortar también a bots con cookies):
      // límite por IP.
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";
      if (rateLimited(ip)) {
        return new NextResponse("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": "60" },
        });
      }

      // Capa 2: desafío de cookie — solo para visitantes sin NINGUNA
      // cookie nuestra (ni la del desafío ni sesión de Supabase).
      const hasChallengeCookie = request.cookies.has(CHALLENGE_COOKIE);
      const hasSession = request.cookies
        .getAll()
        .some((c) => c.name.startsWith("sb-"));
      if (!hasChallengeCookie && !hasSession) {
        const cameBack = request.nextUrl.searchParams.get(CHALLENGE_PARAM) === "1";
        if (cameBack) {
          // Volvió del 302 sin guardar la cookie → no es un navegador.
          return new NextResponse("Forbidden", { status: 403 });
        }
        const url = request.nextUrl.clone();
        url.searchParams.set(CHALLENGE_PARAM, "1");
        const res = NextResponse.redirect(url, 302);
        res.cookies.set(CHALLENGE_COOKIE, "1", {
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          sameSite: "lax",
          httpOnly: true,
        });
        return res;
      }
      if (hasChallengeCookie && request.nextUrl.searchParams.has(CHALLENGE_PARAM)) {
        // Pasó el desafío: limpiar el parámetro de la URL (cosmético).
        const url = request.nextUrl.clone();
        url.searchParams.delete(CHALLENGE_PARAM);
        return NextResponse.redirect(url, 302);
      }
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
