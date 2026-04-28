"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) throw new Error("No autorizado");
  return supabase;
}

export type FinalState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const FIFA = /^[A-Z]{3}$/;

function parseInt0(raw: string | null, max = 99): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > max) return NaN;
  return n;
}

export async function saveTournamentResult(
  _prev: FinalState,
  formData: FormData,
): Promise<FinalState> {
  const champion = ((formData.get("champion") as string) || "").trim() || null;
  const runnerUp = ((formData.get("runner_up") as string) || "").trim() || null;
  const pichichi =
    ((formData.get("pichichi_name") as string) || "").trim() || null;
  const pichichiGoals = parseInt0(
    formData.get("pichichi_actual_goals") as string | null,
    99,
  );
  const finalScorersRaw =
    ((formData.get("final_scorer_names") as string) || "").trim();
  const hatTricks = parseInt0(
    formData.get("hat_tricks_count") as string | null,
    99,
  );

  if (champion && !FIFA.test(champion)) {
    return { status: "error", message: "Equipo campeón inválido." };
  }
  if (runnerUp && !FIFA.test(runnerUp)) {
    return { status: "error", message: "Equipo subcampeón inválido." };
  }
  if (champion && runnerUp && champion === runnerUp) {
    return {
      status: "error",
      message: "Campeón y subcampeón no pueden ser el mismo equipo.",
    };
  }
  if (pichichiGoals !== null && Number.isNaN(pichichiGoals)) {
    return { status: "error", message: "Goles del pichichi inválidos." };
  }
  if (hatTricks !== null && Number.isNaN(hatTricks)) {
    return { status: "error", message: "Total de hat-tricks inválido." };
  }

  // Lista de goleadores en la final, separados por coma o salto de línea
  const finalScorers = finalScorersRaw
    ? finalScorersRaw
        .split(/[,\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("tournament_results")
    .update({
      champion_team: champion,
      runner_up_team: runnerUp,
      pichichi_name: pichichi,
      pichichi_actual_goals: pichichiGoals,
      final_scorer_names: finalScorers,
      hat_tricks_count: hatTricks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/resultado-final");
  return { status: "success", message: "Resultado del torneo actualizado." };
}
