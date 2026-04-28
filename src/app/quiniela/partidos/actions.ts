"use server";

import { createClient } from "@/lib/supabase/server";

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "locked" | "invalid" | "db"; message: string };

export async function savePrediction(
  matchId: number,
  scoreHome: number,
  scoreAway: number,
): Promise<SaveResult> {
  if (
    !Number.isInteger(matchId) ||
    !Number.isInteger(scoreHome) ||
    !Number.isInteger(scoreAway) ||
    scoreHome < 0 ||
    scoreAway < 0 ||
    scoreHome > 99 ||
    scoreAway > 99
  ) {
    return {
      ok: false,
      reason: "invalid",
      message: "Resultado fuera de rango (0-99).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "auth", message: "Inicia sesión." };
  }

  const { error } = await supabase
    .from("predictions")
    .upsert(
      {
        user_id: user.id,
        match_id: matchId,
        score_home: scoreHome,
        score_away: scoreAway,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,match_id" },
    );

  if (error) {
    // RLS blocks if kickoff <= now()
    if (
      error.code === "42501" ||
      error.message?.toLowerCase().includes("row-level security")
    ) {
      return {
        ok: false,
        reason: "locked",
        message: "El partido ya empezó, ya no puedes editar.",
      };
    }
    return { ok: false, reason: "db", message: error.message };
  }

  return { ok: true };
}
