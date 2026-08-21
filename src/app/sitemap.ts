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
 * Incluye partidos y equipos de las 9 competiciones. Las fichas de jugador se
 * quedan fuera a propósito: son cientos por competición, son las páginas más
 * caras de servir, y Google llega a ellas igual siguiendo los enlaces desde
 * las de partido y equipo. Mejor que descubra las caras a su ritmo.
 */
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

  const partidos: MetadataRoute.Sitemap = [];
  const equipos = new Map<string, { url: string; slug: string }>();

  await Promise.all(
    COMPETITIONS.map(async (c) => {
      const fixtures = await readCache<Fixture[]>(
        allFixturesCacheKey(c),
        MAX_AGE,
      );
      if (!fixtures) return;

      for (const f of fixtures) {
        partidos.push({
          url: `${SITE}/liga/${c.slug}/partido/${f.fixture.id}`,
          lastModified: new Date(f.fixture.date),
          // Un partido cambia mientras se juega y luego ya no.
          changeFrequency: "weekly",
          priority: 0.7,
        });
        for (const t of [f.teams.home, f.teams.away]) {
          const key = `${c.slug}:${t.id}`;
          if (!equipos.has(key)) {
            equipos.set(key, {
              url: `${SITE}/liga/${c.slug}/equipo/${t.id}`,
              slug: c.slug,
            });
          }
        }
      }
    }),
  );

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
