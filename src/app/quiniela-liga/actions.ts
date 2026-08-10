"use server";

import { createClient } from "@/lib/supabase/server";

/** Liga pública "Quiniela LaLiga 2026-27" (código LALIGA2627). Al guardar el
 * primer pronóstico, el usuario se da de alta aquí sin fricción. */
const PUBLIC_LEAGUE_ID = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "locked" | "error"; message: string };

/**
 * Guarda (o actualiza) el marcador pronosticado de un partido de la quiniela
 * de clubes. El candado de 30 min lo impone la RLS de `lq_predictions`; aquí
 * solo traducimos el error a un motivo legible. De paso da de alta al usuario
 * en la liga pública (idempotente) para que aparezca en el ranking.
 */
export async function savePrediction(
  matchId: number,
  scoreHome: number,
  scoreAway: number,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth", message: "Inicia sesión" };

  if (
    !Number.isInteger(scoreHome) ||
    !Number.isInteger(scoreAway) ||
    scoreHome < 0 ||
    scoreAway < 0 ||
    scoreHome > 99 ||
    scoreAway > 99
  ) {
    return { ok: false, reason: "error", message: "Marcador inválido" };
  }

  // Alta sin fricción en la liga pública (no falla si ya es miembro).
  await supabase.rpc("join_public_league", { p_league_id: PUBLIC_LEAGUE_ID });

  const { error } = await supabase.from("lq_predictions").upsert({
    user_id: user.id,
    match_id: matchId,
    score_home: scoreHome,
    score_away: scoreAway,
  });

  if (error) {
    // La RLS rechaza inserciones/updates a <30 min del kickoff.
    if (/row-level security|policy|violates/i.test(error.message)) {
      return { ok: false, reason: "locked", message: "Cerrado (falta <30min)" };
    }
    return { ok: false, reason: "error", message: "No se pudo guardar" };
  }
  return { ok: true };
}

/** Alta explícita en la liga pública (botón "Unirme", sin código). */
export async function joinQuinielaLiga(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc("join_public_league", {
    p_league_id: PUBLIC_LEAGUE_ID,
  });
  return { ok: !error };
}

export type PicksResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "locked" | "error"; message: string };

/**
 * Guarda las selecciones especiales de temporada (campeón, pichichi, hasta 3
 * descendidos). La RLS bloquea la escritura una vez arrancada LaLiga. De paso
 * da de alta al usuario en la liga pública.
 */
export async function saveSeasonPicks(
  championTeam: number | null,
  pichichiName: string,
  relegatedTeams: number[],
): Promise<PicksResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth", message: "Inicia sesión" };

  const rel = [
    ...new Set(relegatedTeams.filter((n) => Number.isInteger(n) && n > 0)),
  ].slice(0, 3);

  await supabase.rpc("join_public_league", { p_league_id: PUBLIC_LEAGUE_ID });

  const { error } = await supabase.from("lq_season_picks").upsert({
    user_id: user.id,
    competition: "laliga",
    season: 2026,
    champion_team: championTeam,
    pichichi_name: pichichiName.trim() || null,
    relegated_teams: rel,
  });

  if (error) {
    if (/row-level security|policy|violates/i.test(error.message)) {
      return {
        ok: false,
        reason: "locked",
        message: "Los picks ya están cerrados (LaLiga arrancó)",
      };
    }
    return { ok: false, reason: "error", message: "No se pudo guardar" };
  }
  return { ok: true };
}
