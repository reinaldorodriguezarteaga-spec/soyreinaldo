import type { SupabaseClient } from "@supabase/supabase-js";
import { getFixtureLineups } from "@/lib/sports/api-football";

/**
 * «Adivina el once» (migración 082): el once titular del Barça antes de cada
 * partido. Puntos: 1 por titular acertado, +1 si clava la formación y +3 de
 * premio por el pleno (11 de 11).
 */

export const EQUIPO_ONCE = 529;
/** Se cierra una hora antes: es cuando el club publica la alineación. */
export const CIERRE_MINUTOS = 60;
export const TEMPORADA_DESDE = "2026-07-01T00:00:00Z";

export type Puntuacion = { aciertos: number; formacionOk: boolean; puntos: number };

export function puntuar(
  prediccion: { jugadores: number[]; formacion: string },
  real: { titulares: number[]; formacion: string | null },
): Puntuacion {
  const titulares = new Set(real.titulares);
  const aciertos = new Set(prediccion.jugadores.filter((id) => titulares.has(id))).size;
  const formacionOk = !!real.formacion && real.formacion === prediccion.formacion;
  return { aciertos, formacionOk, puntos: aciertos + (formacionOk ? 1 : 0) + (aciertos === 11 ? 3 : 0) };
}

export const cerrado = (kickoff: Date, ahora = new Date()) =>
  ahora.getTime() >= kickoff.getTime() - CIERRE_MINUTOS * 60_000;

/** Puntúa las predicciones de partidos ya empezados cuya alineación esté
 * publicada. Hasta `max` partidos por llamada; las alineaciones salen de la
 * misma caché que la ficha del partido. */
export async function puntuarPendientes(db: SupabaseClient, max = 5): Promise<number> {
  const { data } = await db
    .from("once_predicciones")
    .select("fixture_id, team_id")
    .is("puntos", null)
    .lt("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(500);
  const partidos = [...new Map((data ?? []).map((r) => [`${r.fixture_id}:${r.team_id}`, r])).values()].slice(0, max);
  let hechos = 0;
  for (const { fixture_id, team_id } of partidos) {
    const alineacion = (await getFixtureLineups(fixture_id).catch(() => [])).find((l) => l.teamId === team_id);
    if (!alineacion || alineacion.startXI.length !== 11) continue;
    const real = { titulares: alineacion.startXI.map((p) => p.id), formacion: alineacion.formation };
    const { data: filas } = await db
      .from("once_predicciones")
      .select("user_id, jugadores, formacion")
      .eq("fixture_id", fixture_id)
      .eq("team_id", team_id)
      .is("puntos", null);
    for (const f of filas ?? []) {
      const p = puntuar({ jugadores: f.jugadores as number[], formacion: f.formacion as string }, real);
      await db
        .from("once_predicciones")
        .update({ aciertos: p.aciertos, formacion_ok: p.formacionOk, puntos: p.puntos })
        .eq("fixture_id", fixture_id)
        .eq("team_id", team_id)
        .eq("user_id", f.user_id);
    }
    hechos++;
  }
  return hechos;
}
