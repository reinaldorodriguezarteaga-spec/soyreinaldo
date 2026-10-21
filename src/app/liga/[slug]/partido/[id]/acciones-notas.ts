"use server";

import { createClient } from "@/lib/supabase/server";
import { getFixtureById, getFixturePlayersTodos, isFinal } from "@/lib/sports/api-football";

/** Días tras el partido en los que se puede votar. */
const DIAS_ABIERTO = 7;

/**
 * Guarda las notas de la afición de un partido (1-10). Solo jugadores que
 * jugaron, solo con el partido terminado y durante una semana.
 */
export async function guardarNotas(
  fixtureId: number,
  notas: Record<number, number>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para votar." };

  const fx = await getFixtureById(fixtureId).catch(() => null);
  if (!fx || !isFinal(fx)) return { ok: false, error: "El partido aún no ha terminado." };
  if (Date.now() - new Date(fx.fixture.date).getTime() > DIAS_ABIERTO * 86_400_000) {
    return { ok: false, error: "La votación de este partido ya se cerró." };
  }
  const jugaron = new Set(
    (await getFixturePlayersTodos(fixtureId).catch(() => []))
      .flatMap((t) => t.players)
      .filter((p) => (p.minutes ?? 0) > 0)
      .map((p) => p.id),
  );
  const filas = Object.entries(notas)
    .map(([id, nota]) => ({ player_id: Number(id), nota: Math.round(nota) }))
    .filter((f) => jugaron.has(f.player_id) && f.nota >= 1 && f.nota <= 10)
    .map((f) => ({ ...f, fixture_id: fixtureId, user_id: user.id }));
  if (filas.length === 0) return { ok: false, error: "Pon al menos una nota." };

  const { error } = await supabase.from("notas_aficion").upsert(filas, { onConflict: "fixture_id,player_id,user_id" });
  if (error) return { ok: false, error: "No se pudo guardar. Prueba otra vez." };
  return { ok: true };
}
