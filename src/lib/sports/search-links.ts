import { COMPETITIONS, COMPETITIONS_BY_SLUG } from "./competitions";
import { getPlayerLeagueIds } from "./api-football";

/**
 * A qué hub del sitio enlazar un resultado de la búsqueda universal.
 *
 * Las fichas viven en /liga/[slug]/equipo|jugador/[id], así que un resultado
 * global (que puede ser de cualquier liga del mundo) necesita una de NUESTRAS
 * competiciones para el enlace. El historial de equipo y la ficha de jugador
 * funcionan igual con cualquier id; la competición decide sobre todo el
 * encabezado y las estadísticas de liga.
 */

/** Liga por defecto cuando no sabemos encajar el resultado en ninguna
 * nuestra: la de casa. La ficha sigue mostrando historial y palmarés. */
const FALLBACK_SLUG = "laliga";

/** País de API-Football → competición doméstica nuestra. */
const PAIS_A_SLUG: Record<string, string> = {
  Spain: "laliga",
  England: "premier",
  Italy: "serie-a",
  France: "ligue-1",
};

/** Competición para enlazar un EQUIPO, deducida de su país (viene en la
 * respuesta de búsqueda, así que no cuesta ninguna llamada extra). */
export function slugParaEquipo(country: string | null): string {
  return (country && PAIS_A_SLUG[country]) || FALLBACK_SLUG;
}

/** ¿Es de una liga que seguimos? Los que no (un Chelsea de Ghana, un
 * Barcelona de Ecuador) van al final de los resultados: su ficha funciona
 * —el historial de partidos no depende de la liga— pero se abre bajo el hub
 * de una competición que no es la suya. */
export function seguimosSuPais(country: string | null): boolean {
  return !!country && country in PAIS_A_SLUG;
}

/**
 * Competición para enlazar un JUGADOR. Cuesta una llamada (sus ligas de esta
 * temporada), así que se hace solo al abrir su ficha, no por cada resultado
 * de la lista.
 */
export async function slugParaJugador(playerId: number): Promise<string> {
  // La season de referencia es la de LaLiga: todas nuestras competiciones
  // europeas comparten año de arranque.
  const season = COMPETITIONS_BY_SLUG[FALLBACK_SLUG]?.season ?? new Date().getFullYear();
  const ligas = await getPlayerLeagueIds(playerId, season);
  if (ligas.length === 0) return FALLBACK_SLUG;

  // Preferimos una liga doméstica antes que una copa o competición UEFA:
  // es donde el jugador tiene las estadísticas completas de la temporada.
  const domesticas = ["laliga", "premier", "serie-a", "ligue-1"];
  for (const slug of domesticas) {
    const c = COMPETITIONS_BY_SLUG[slug];
    if (c && ligas.includes(c.leagueId)) return slug;
  }
  const otra = COMPETITIONS.find((c) => ligas.includes(c.leagueId));
  return otra?.slug ?? FALLBACK_SLUG;
}
