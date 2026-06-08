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
  const tercero = ((formData.get("tercer_lugar") as string) || "").trim() || null;
  const topScoring =
    ((formData.get("top_scoring_team") as string) || "").trim() || null;
  const pichichi =
    ((formData.get("pichichi_name") as string) || "").trim() || null;
  const balonOro = ((formData.get("balon_oro") as string) || "").trim() || null;
  const guanteOro = ((formData.get("guante_oro") as string) || "").trim() || null;
  const revelacion =
    ((formData.get("jugador_revelacion") as string) || "").trim() || null;
  const asistidor =
    ((formData.get("max_asistidor") as string) || "").trim() || null;
  const pichichiGoals = parseInt0(
    formData.get("pichichi_actual_goals") as string | null,
    99,
  );
  const finalScorersRaw =
    ((formData.get("final_scorer_names") as string) || "").trim();

  for (const [val, label] of [
    [champion, "campeón"],
    [runnerUp, "subcampeón"],
    [tercero, "tercer lugar"],
    [topScoring, "equipo más goleador"],
  ] as const) {
    if (val && !FIFA.test(val)) {
      return { status: "error", message: `Equipo de ${label} inválido.` };
    }
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
      tercer_lugar: tercero,
      top_scoring_team: topScoring,
      pichichi_name: pichichi,
      pichichi_actual_goals: pichichiGoals,
      final_scorer_names: finalScorers,
      balon_oro: balonOro,
      guante_oro: guanteOro,
      jugador_revelacion: revelacion,
      max_asistidor: asistidor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/resultado-final");
  return { status: "success", message: "Resultado del torneo actualizado." };
}
