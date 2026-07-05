import type { MetadataRoute } from "next";

/**
 * robots.txt — mantiene a los crawlers fuera de las páginas dinámicas pesadas.
 *
 * `/mundial/partido/[id]` y `/mundial/equipo/[id]` tiran de API-Football (hasta
 * 6 llamadas por página) y enlazan a cientos de partidos de historial/H2H que NO
 * son del Mundial. Un crawler siguiéndolos barre >1.700 páginas y dispara la
 * quota (fue la causa del pico del 5-jul). No aportan SEO, así que se bloquean.
 * El caché las abarata igualmente; esto es defensa en profundidad.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/mundial/partido/", "/mundial/equipo/", "/api/", "/admin/"],
    },
  };
}
