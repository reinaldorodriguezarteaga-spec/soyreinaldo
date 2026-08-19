import type { MetadataRoute } from "next";

/**
 * robots.txt — mantiene a los crawlers fuera de las páginas dinámicas pesadas.
 *
 * `/mundial/partido/[id]` y `/mundial/equipo/[id]` tiran de API-Football (hasta
 * 6 llamadas por página) y enlazan a cientos de partidos de historial/H2H que NO
 * son del Mundial. Un crawler siguiéndolos barre >1.700 páginas y dispara la
 * quota (fue la causa del pico del 5-jul). No aportan SEO, así que se bloquean.
 * El caché las abarata igualmente; esto es defensa en profundidad.
 *
 * `/liga/[slug]/partido/[id]` y `/liga/[slug]/equipo/[id]` son el mismo patrón
 * (equivalente genérico del Mundial, migración de hoy, 9 competiciones × 2
 * temporadas cada una = mucha más superficie que barrer) — mismo bloqueo,
 * mismo motivo. Confirmado el 23-jul: un solo crawler generando cientos de
 * 429 sostenidos en /liga/[slug]/partido/[id] durante más de una hora.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/mundial/partido/",
        "/mundial/equipo/",
        "/mundial/jugador/",
        "/mundial/comparar",
        "/liga/*/partido/",
        "/liga/*/equipo/",
        // Añadidas 19-ago: las fichas de jugador (5-6 llamadas a la API cada
        // una) no estaban y un crawler barrió 19.133 en 6h agotando la cuota
        // diaria. El middleware además bloquea activamente a los bots que
        // ignoran este archivo (pasó con /partido/ desde julio).
        "/liga/*/jugador/",
        "/liga/*/comparar",
        "/api/",
        "/admin/",
      ],
    },
  };
}
