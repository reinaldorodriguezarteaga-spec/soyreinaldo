"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PicksState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const FIFA_CODE_RE = /^[A-Z]{3}$/;

function parseSmallInt(raw: string | null, max = 999): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > max) return NaN;
  return n;
}

export async function savePicks(
  _prev: PicksState,
  formData: FormData,
): Promise<PicksState> {
  const champion = (formData.get("champion") as string | null) || null;
  const runnerUp = (formData.get("runner_up") as string | null) || null;
  const topScoring = (formData.get("top_scoring_team") as string | null) || null;
  const leastConceded =
    (formData.get("least_conceded_team") as string | null) || null;
  const pichichi = (formData.get("pichichi_name") as string | null)?.trim() || null;
  const finalScorer =
    (formData.get("final_scorer_name") as string | null)?.trim() || null;
  const pichichiGoalsRaw = formData.get("pichichi_predicted_goals") as
    | string
    | null;
  const hatTricksRaw = formData.get("hat_tricks_count") as string | null;

  if (champion && !FIFA_CODE_RE.test(champion)) {
    return { status: "error", message: "Equipo campeón inválido." };
  }
  if (runnerUp && !FIFA_CODE_RE.test(runnerUp)) {
    return { status: "error", message: "Equipo subcampeón inválido." };
  }
  if (topScoring && !FIFA_CODE_RE.test(topScoring)) {
    return { status: "error", message: "Equipo más goleador inválido." };
  }
  if (leastConceded && !FIFA_CODE_RE.test(leastConceded)) {
    return { status: "error", message: "Equipo menos goleado inválido." };
  }
  if (champion && runnerUp && champion === runnerUp) {
    return {
      status: "error",
      message: "El campeón y el subcampeón no pueden ser el mismo equipo.",
    };
  }
  const pichichiGoals = parseSmallInt(pichichiGoalsRaw, 99);
  if (pichichiGoals !== null && Number.isNaN(pichichiGoals)) {
    return { status: "error", message: "Goles del pichichi inválidos." };
  }
  const hatTricks = parseSmallInt(hatTricksRaw, 99);
  if (hatTricks !== null && Number.isNaN(hatTricks)) {
    return { status: "error", message: "Total de hat-tricks inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sesión expirada." };
  }

  const { error } = await supabase
    .from("user_picks")
    .upsert(
      {
        user_id: user.id,
        champion_team: champion,
        runner_up_team: runnerUp,
        top_scoring_team: topScoring,
        least_conceded_team: leastConceded,
        pichichi_name: pichichi,
        pichichi_predicted_goals: pichichiGoals,
        final_scorer_name: finalScorer,
        hat_tricks_count: hatTricks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    if (
      error.code === "42501" ||
      error.message?.toLowerCase().includes("row-level security")
    ) {
      return {
        status: "error",
        message: "El torneo ya empezó, los picks especiales están bloqueados.",
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath("/quiniela/picks");
  return { status: "success", message: "Picks guardados." };
}
