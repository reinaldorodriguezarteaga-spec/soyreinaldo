// Helpers PUROS de ligas de clubes: sin Supabase, sin `next/headers`, sin
// nada de servidor. Separados de `leagues.ts` para que los pueda importar
// tanto un componente de cliente como una prueba, y para poder probarlos
// sin levantar media aplicación.

/**
 * Ligas de la quiniela de CLUBES (LaLiga 2026-27).
 *
 * Los pronósticos son globales por usuario (`lq_predictions` no tiene liga):
 * una liga solo agrupa a gente para clasificar entre ella. Por eso alguien
 * puede estar en la liga pública y en una privada a la vez, y sus mismos
 * pronósticos puntúan en ambas.
 */
export type ClubLeague = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isPublic: boolean;
  /** Rol del usuario actual dentro de esa liga. */
  role: "member" | "admin";
};

/**
 * Liga activa a partir del `?liga=` de la URL (acepta código o id). Si no
 * viene o no cuadra, la primera: la pública para el público general, la suya
 * para quien solo está en una privada.
 */
export function pickLeague(
  leagues: ClubLeague[],
  wanted?: string,
): ClubLeague | null {
  if (leagues.length === 0) return null;
  const key = wanted?.trim().toLowerCase();
  if (key) {
    const match = leagues.find(
      (l) => l.code.toLowerCase() === key || l.id.toLowerCase() === key,
    );
    if (match) return match;
  }
  return leagues[0];
}

/**
 * Añade `?liga=` solo cuando hace falta (la pública es el destino por
 * defecto). Viaja el **id**, no el código: el código es la llave para entrar
 * a una liga privada y no tiene por qué acabar en la barra de direcciones de
 * cada miembro. `pickLeague` acepta los dos, así que los enlaces viejos con
 * código siguen funcionando.
 */
export function leagueHref(path: string, league: ClubLeague | null): string {
  if (!league || league.isPublic) return path;
  return `${path}?liga=${encodeURIComponent(league.id)}`;
}

/** Baremo de puntuación de una liga, en texto. */
export type Baremo = { exacto: number; acierto: number };

/**
 * "marcador exacto 5 pts, acertar el ganador 2 pts".
 *
 * Estas cifras estaban escritas a mano en cinco pantallas, y cuando el dueño
 * cambió el baremo de 3/1 a 5/2 la web siguió anunciando lo viejo. Ahora se
 * escriben desde el dato real, como el total de seguidores.
 */
export function textoBaremo({ exacto, acierto }: Baremo): string {
  const pts = (n: number) => `${n} ${n === 1 ? "pt" : "pts"}`;
  return `marcador exacto ${pts(exacto)}, acertar el ganador ${pts(acierto)}`;
}
