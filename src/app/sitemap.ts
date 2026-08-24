import type { MetadataRoute } from "next";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { allFixturesCacheKey, type Fixture } from "@/lib/sports/api-football";
import { readCache } from "@/lib/sports/sports-cache";
import { listarPublicados } from "@/lib/analisis/queries";

const SITE = "https://www.soyreinaldo.com";

/** Una semana: al sitemap le vale cualquier cosa que el cron haya dejado. */
const MAX_AGE = 60 * 60 * 24 * 7;

export const revalidate = 3600;

/**
 * Sitemap.
 *
 * Se construye ENTERO desde `sports_cache` (la caché que refresca el cron cada
 * 10 min), no llamando a API-Football: generar el sitemap no puede costar
 * cuota, o volveríamos al problema que nos trajo aquí.
 *
 * CURADO (23-ago-2026). Antes iban las 4.124 URLs de las 10 competiciones y
 * Search Console devolvió 3.782 como "Descubierta: actualmente sin indexar":
 * un sitio joven tiene poco presupuesto de rastreo y lo estábamos gastando en
 * páginas que nadie busca — 872 partidos y 749 equipos eran solo de la FA Cup,
 * clubes de regional inglesa, con una audiencia que es casi toda hispana.
 * Ahora entra solo lo que alguien puede buscar (ver las tres reglas abajo).
 *
 * Lo excluido NO desaparece: sigue en la web y enlazado, simplemente dejamos
 * de empujárselo a Google.
 *
 * Las fichas de jugador se quedan fuera igual que antes: son cientos por
 * competición y las más caras de servir; Google llega por los enlaces.
 */

/** Ligas domésticas cuyos clubes son "conocidos". Sirve para dos cosas:
 *  1. Un equipo entra en el sitemap SOLO bajo su liga doméstica. Antes el
 *     mismo club tenía una URL por cada competición que juega
 *     (/liga/champions/equipo/529 y /liga/laliga/equipo/529 son el mismo
 *     Barça): contenido duplicado servido en bandeja.
 *  2. Un partido entra solo si lo juega al menos uno de esos clubes, que es
 *     lo que deja fuera los cruces de rondas previas entre desconocidos. */
const LIGAS_DOMESTICAS = ["laliga", "premier", "serie-a", "ligue-1"];

/** Ventana de partidos: un partido se busca cuando está cerca, no ocho meses
 * antes. Fuera de esto la página existe pero no la anunciamos. */
const DIAS_ATRAS = 45;
const DIAS_ADELANTE = 30;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/redes`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/camisetas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/estadios`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/asesorias`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/media-kit`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/contacto`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/quiniela-liga`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/quiniela-liga/reglas`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const competiciones: MetadataRoute.Sitemap = COMPETITIONS.map((c) => ({
    url: `${SITE}/liga/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Los análisis: son el contenido propio, el que de verdad puede posicionar
  // por sí solo. Van con prioridad alta y su fecha real de publicación.
  const analisis: MetadataRoute.Sitemap = (await listarPublicados(200).catch(() => []))
    .map((a) => ({
      url: `${SITE}/analisis/${a.slug}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }));

  const desde = now.getTime() - DIAS_ATRAS * 86_400_000;
  const hasta = now.getTime() + DIAS_ADELANTE * 86_400_000;

  // Los partidos de cada competición, una sola lectura de caché por liga.
  const porCompeticion = await Promise.all(
    COMPETITIONS.map(async (c) => ({
      c,
      fixtures: (await readCache<Fixture[]>(allFixturesCacheKey(c), MAX_AGE)) ?? [],
    })),
  );

  // Paso 1: quiénes son los clubes conocidos y bajo qué liga se les enlaza.
  const equipos = new Map<number, { url: string }>();
  for (const { c, fixtures } of porCompeticion) {
    if (!LIGAS_DOMESTICAS.includes(c.slug)) continue;
    for (const f of fixtures) {
      for (const t of [f.teams.home, f.teams.away]) {
        if (!equipos.has(t.id)) {
          equipos.set(t.id, { url: `${SITE}/liga/${c.slug}/equipo/${t.id}` });
        }
      }
    }
  }

  // Paso 2: los partidos, con ventana temporal y al menos un club conocido.
  const partidos: MetadataRoute.Sitemap = [];
  for (const { c, fixtures } of porCompeticion) {
    for (const f of fixtures) {
      const cuando = new Date(f.fixture.date).getTime();
      if (cuando < desde || cuando > hasta) continue;
      if (!equipos.has(f.teams.home.id) && !equipos.has(f.teams.away.id)) continue;
      partidos.push({
        url: `${SITE}/liga/${c.slug}/partido/${f.fixture.id}`,
        lastModified: new Date(f.fixture.date),
        // Un partido cambia mientras se juega y luego ya no.
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return [
    ...estaticas,
    { url: `${SITE}/analisis`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 },
    ...analisis,
    ...competiciones,
    ...[...equipos.values()].map((e) => ({
      url: e.url,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...partidos,
  ];
}
