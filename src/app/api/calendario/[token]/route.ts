import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import {
  allFixturesCacheKey,
  isFinal,
  teamFixturesNextCacheKey,
  type Fixture,
} from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { conTildes } from "@/lib/sports/nombres";
import { readCache } from "@/lib/sports/sports-cache";
import { calendarioIcs, type EventoPartido } from "@/lib/calendario/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Calendario de "Mis equipos" (16-oct, pedido del dueño): todos los partidos
 * de los equipos favoritos de una persona, para suscribirse desde Google
 * Calendar o el iPhone. `/api/calendario/<token>.ics`, con el token secreto de
 * `profiles.calendario_token` (migración 069): las apps de calendario no
 * mandan cookies.
 *
 * ⚠️ Cuota: SOLO lee la caché que precalcula el cron (temporada completa de
 * cada competición y próximos de los equipos destacados). Nunca llama a
 * API-Football: las apps de calendario consultan cuando quieren.
 */
const DIAS_ATRAS = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const token = (await ctx.params).token.replace(/\.ics$/i, "");
  if (!UUID_RE.test(token)) return new Response("No encontrado", { status: 404 });
  const db = clienteServicio();
  if (!db) return new Response("Sin configurar", { status: 500 });

  const { data: perfil } = await db
    .from("profiles")
    .select("id")
    .eq("calendario_token", token)
    .maybeSingle<{ id: string }>();
  if (!perfil) return new Response("No encontrado", { status: 404 });

  const { data: favs } = await db
    .from("user_favorites")
    .select("ref_id")
    .eq("user_id", perfil.id)
    .eq("kind", "team")
    .returns<{ ref_id: string }[]>();
  const equipos = new Set(
    (favs ?? []).map((f) => Number(f.ref_id)).filter((n) => Number.isInteger(n) && n > 0),
  );

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.soyreinaldo.com";
  const ahora = Date.now();
  const desde = ahora - DIAS_ATRAS * 86_400_000;
  const eventos = new Map<number, EventoPartido>();
  const meter = (f: Fixture, slug: string | null, competicion: string) => {
    if (!equipos.has(f.teams.home.id) && !equipos.has(f.teams.away.id)) return;
    if (Date.parse(f.fixture.date) < desde || eventos.has(f.fixture.id)) return;
    eventos.set(f.fixture.id, {
      id: f.fixture.id,
      inicio: f.fixture.date,
      local: conTildes(f.teams.home.name),
      visitante: conTildes(f.teams.away.name),
      competicion,
      url: slug ? `${site}/liga/${slug}/partido/${f.fixture.id}` : site,
      resultado:
        isFinal(f) && f.goals.home != null && f.goals.away != null
          ? `${f.goals.home}–${f.goals.away}`
          : null,
    });
  };

  if (equipos.size > 0) {
    const temporadas = await Promise.all(
      COMPETITIONS.map((c) =>
        readCache<Fixture[]>(allFixturesCacheKey(c), Number.POSITIVE_INFINITY).catch(() => null),
      ),
    );
    COMPETITIONS.forEach((c, i) => {
      for (const f of temporadas[i] ?? []) meter(f, c.slug, c.name);
    });
    // Partidos de otras competiciones (amistosos, copas sin seguimiento):
    // solo si el cron ya los tiene de los equipos destacados.
    const proximos = await Promise.all(
      [...equipos].map((id) =>
        readCache<Fixture[]>(teamFixturesNextCacheKey(id, 4), 7 * 86_400).catch(() => null),
      ),
    );
    for (const lista of proximos) {
      for (const f of lista ?? []) {
        const c = COMPETITIONS.find((x) => x.leagueId === f.league.id);
        meter(f, c?.slug ?? null, c?.name ?? f.league.name);
      }
    }
  }

  const lista = [...eventos.values()].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  return new Response(calendarioIcs(lista, ahora, "Mis equipos · Soy Reinaldo"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="mis-equipos.ics"',
      "Cache-Control": "private, max-age=1800",
    },
  });
}
