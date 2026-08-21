import { createClient } from "@/lib/supabase/server";
import type { Baremo } from "./league-utils";

/** Si la consulta falla, lo que valía históricamente. */
const POR_DEFECTO: Baremo = { exacto: 3, acierto: 1 };

/**
 * Baremo de la liga pública de clubes — el que se anuncia en la portada y en
 * las páginas abiertas. Se lee de la base de datos en vez de escribirse a
 * mano: el 21-ago la web seguía diciendo "3 pts" tres días después de que el
 * baremo pasara a 5/2.
 */
export async function getBaremoPublico(): Promise<Baremo> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leagues")
      .select("lq_points_exact, lq_points_result")
      .eq("is_public", true)
      .eq("kind", "clubs")
      .order("created_at")
      .limit(1)
      .maybeSingle<{ lq_points_exact: number; lq_points_result: number }>();
    if (!data) return POR_DEFECTO;
    return { exacto: data.lq_points_exact, acierto: data.lq_points_result };
  } catch {
    return POR_DEFECTO;
  }
}

/**
 * Baremo de UNA liga concreta. Cada quiniela privada pone sus normas (la de
 * Pacha puntúa 3/1 mientras la pública va a 5/2), así que todo lo que muestre
 * puntos dentro de una liga tiene que preguntar por su id, no por el público.
 */
export async function getBaremoDeLiga(
  leagueId: string | null | undefined,
): Promise<Baremo> {
  if (!leagueId) return getBaremoPublico();
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("leagues")
      .select("lq_points_exact, lq_points_result")
      .eq("id", leagueId)
      .maybeSingle<{ lq_points_exact: number; lq_points_result: number }>();
    if (!data) return POR_DEFECTO;
    return { exacto: data.lq_points_exact, acierto: data.lq_points_result };
  } catch {
    return POR_DEFECTO;
  }
}
