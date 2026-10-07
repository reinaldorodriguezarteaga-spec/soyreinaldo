import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { standingsCacheKey, type StandingRow } from "@/lib/sports/api-football";
import { readCache } from "@/lib/sports/sports-cache";
import { formaEquipos, type FormaEquipo } from "./forma";

/**
 * Forma de todos los equipos de una competición de la quiniela: tabla
 * oficial de la caché del cron (sin gastar cuota) o, si no la hay, calculada
 * con nuestros resultados de `lq_matches`. La usan las tarjetas de la
 * quiniela y la previa de la ficha del partido.
 */
export async function cargarForma(
  supabase: SupabaseClient,
  competition: string,
  season: number,
): Promise<Map<number, FormaEquipo>> {
  const competicion = COMPETITIONS_BY_SLUG[competition];
  const [{ data: jugados }, oficial] = await Promise.all([
    supabase
      .from("lq_matches")
      .select("team_home, team_away, score_home, score_away, kickoff_at")
      .eq("competition", competition)
      .eq("season", season)
      .eq("finished", true)
      .returns<
        {
          team_home: number;
          team_away: number;
          score_home: number | null;
          score_away: number | null;
          kickoff_at: string;
        }[]
      >(),
    competicion
      ? readCache<StandingRow[]>(standingsCacheKey(competicion), 6 * 3600).catch(() => null)
      : Promise.resolve(null),
  ]);
  return formaEquipos(
    (jugados ?? [])
      .filter((m) => m.score_home != null && m.score_away != null)
      .map((m) => ({
        local: m.team_home,
        visitante: m.team_away,
        golesLocal: m.score_home!,
        golesVisitante: m.score_away!,
        kickoffAt: m.kickoff_at,
      })),
    Array.isArray(oficial)
      ? oficial.map((f) => ({ teamId: f.team.id, puesto: f.rank, dg: f.goalsDiff }))
      : null,
  );
}
