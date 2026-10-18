import type { SupabaseClient } from "@supabase/supabase-js";
import { todasLasFilas } from "@/lib/supabase/paginado";
import type { FilaJornadaJugador } from "./medallas";

/** `lq_jornadas_jugador()` entero (una fila por jugador y jornada): con la
 * temporada avanzada pasa de las 1.000 filas que devuelve Supabase. */
export function jornadasDeLaLiga(db: SupabaseClient, leagueId: string): Promise<FilaJornadaJugador[]> {
  return todasLasFilas<FilaJornadaJugador>((desde, hasta) =>
    db
      .rpc("lq_jornadas_jugador", { p_league_id: leagueId })
      .order("user_id")
      .order("matchday")
      .range(desde, hasta),
  );
}
