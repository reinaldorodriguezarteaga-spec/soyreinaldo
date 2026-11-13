import type { MetadataRoute } from "next";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { listarPublicados } from "@/lib/analisis/queries";

const SITE = "https://www.soyreinaldo.com";

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
 *
 * ADSENSE (13-nov-2026): fuera también las fichas de PARTIDO y de EQUIPO.
 * AdSense rechazó dos veces por «contenido de poco valor»: el sitemap tenía
 * 580 fichas hechas en automático con datos de la API (94%) frente a 38
 * análisis propios. Además llevan `noindex, follow` (salvo un partido con
 * análisis del dueño). Las páginas siguen en la web para quien las use.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/redes`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/sobre-reinaldo`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/camisetas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/estadios`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/asesorias`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/media-kit`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/contacto`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/quiniela-liga`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/quiniela-liga/reglas`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terminos`, changeFrequency: "yearly", priority: 0.2 },
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

  return [
    ...estaticas,
    { url: `${SITE}/analisis`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${SITE}/messi-vs-ronaldo`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${SITE}/pizarras`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE}/pizarra`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE}/pizarra/fotos`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE}/pizarra/comunidad`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${SITE}/quiniela-champions`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/ranking`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${SITE}/comparador`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE}/juegos`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE}/juegos/adivina-el-equipo`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/adivina-el-jugador`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/top-10`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/ahorcado`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/futbolista-misterioso`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/escudo-borroso`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/foto-oculta`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/agrupa-los-cuatro`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/cronologia`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/adivina-el-once`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE}/juegos/once-de-leyenda`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${SITE}/juegos/mas-o-menos`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${SITE}/juegos/tiki-taka-toe`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 },
    ...analisis,
    ...competiciones,
  ];
}
