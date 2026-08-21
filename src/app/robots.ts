import type { MetadataRoute } from "next";

const SITE = "https://www.soyreinaldo.com";

/**
 * robots.txt
 *
 * Historia corta: estas fichas estuvieron cerradas a los buscadores desde
 * julio. Cada una dispara 5-7 llamadas a API-Football y tres crawlers
 * distintos agotaron la cuota diaria barriéndolas (5-jul, 23-jul y el 19-ago,
 * cuando el crawler de IA de Meta se llevó 19.133 fichas de jugador en 6h).
 * Bloquearlas fue lo que mantuvo la web en pie.
 *
 * El efecto secundario era grave: quien buscara en Google "Lewandowski
 * estadísticas" no podía encontrarnos, y ese es justo el tráfico que hace
 * falta. Con la caché precalculada (`sports_cache`, refrescada por cron cada
 * 10 min) el coste de servir una ficha ya no depende de la API, así que se
 * abren — pero solo a buscadores de verdad, y el middleware sigue echando a
 * todo lo demás.
 *
 * Lo que sigue cerrado y por qué:
 *  - `/liga/*\/comparar`: acepta cualquier par de equipos → combinaciones
 *    infinitas. Es una trampa de rastreo clásica, no una página que indexar.
 *  - `/mundial/*`: ya no existe — el Mundial se retiró del código el 20-ago.
 *  - `/api/`, `/admin/`, `/quiniela*`: privado o sin valor de búsqueda.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/liga/*/comparar",
        "/api/",
        "/admin/",
        "/quiniela-liga/liga/",
        "/unirse/",
        "/perfil",
        "/completar-perfil",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
