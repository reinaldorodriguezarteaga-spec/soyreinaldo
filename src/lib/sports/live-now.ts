import { getCompetitionFixturesWindow, isLive } from "./api-football";
import { COMPETITIONS, type Competition } from "./competitions";
import { attachEvents, type WcFixture } from "./widget-data";

/** Partidos en juego de una competición. */
export type LiveGroup = {
  slug: string;
  name: string;
  fixtures: WcFixture[];
};

/**
 * Todos los partidos que se están jugando AHORA en las competiciones que
 * seguimos, agrupados por competición.
 *
 * No cuesta cuota extra: `getCompetitionFixturesWindow` es la misma llamada
 * (cacheada) que ya usan la portada y el badge "EN VIVO" del header, así que
 * esta página se sirve de lo que ya está en caché.
 *
 * A diferencia del calendario de la portada, aquí NO se aplica
 * `calendarOnlyTeamIds`: si hay fútbol en juego, se enseña — para eso es la
 * página.
 */
export async function getLiveNow(
  competitions: Competition[] = COMPETITIONS,
): Promise<LiveGroup[]> {
  const grupos = await Promise.all(
    competitions.map(async (c): Promise<LiveGroup | null> => {
      try {
        const enJuego = (await getCompetitionFixturesWindow(c)).filter(isLive);
        if (enJuego.length === 0) return null;
        return { slug: c.slug, name: c.name, fixtures: await attachEvents(enJuego) };
      } catch {
        return null;
      }
    }),
  );
  return grupos.filter((g): g is LiveGroup => g !== null);
}
