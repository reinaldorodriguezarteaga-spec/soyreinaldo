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

export type ResultState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function parseTeamId(raw: FormDataEntryValue | null): number | null {
  const s = (raw as string | null) ?? "";
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Resultado final de la quiniela de clubes (LaLiga 2026-27): campeón,
 * pichichi, 3 descendidos (lq_season_picks) + los 5 picks de mitad de
 * temporada — Zamora, máximo asistidor, MVP, equipo menos/más goleado
 * (lq_midseason_picks). Todo vive en la misma fila `lq_season_results`
 * (id=1); `lq_leaderboard()` la usa para puntuar a todo el mundo en cuanto
 * se guarda.
 */
export async function saveLigaSeasonResult(
  _prev: ResultState,
  formData: FormData,
): Promise<ResultState> {
  const championTeam = parseTeamId(formData.get("champion_team"));
  const pichichiName =
    ((formData.get("pichichi_name") as string) || "").trim() || null;
  const relegatedTeams = [
    parseTeamId(formData.get("relegated_1")),
    parseTeamId(formData.get("relegated_2")),
    parseTeamId(formData.get("relegated_3")),
  ].filter((n): n is number => n != null);
  const bestGkName =
    ((formData.get("best_gk_name") as string) || "").trim() || null;
  const bestAssistName =
    ((formData.get("best_assist_name") as string) || "").trim() || null;
  const bestDefenseTeam = parseTeamId(formData.get("best_defense_team"));
  const bestAttackTeam = parseTeamId(formData.get("best_attack_team"));
  const mvpName = ((formData.get("mvp_name") as string) || "").trim() || null;

  if (new Set(relegatedTeams).size !== relegatedTeams.length) {
    return {
      status: "error",
      message: "Los 3 descendidos no pueden repetirse.",
    };
  }

  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("lq_season_results")
    .update({
      champion_team: championTeam,
      pichichi_name: pichichiName,
      relegated_teams: relegatedTeams,
      best_gk_name: bestGkName,
      best_assist_name: bestAssistName,
      best_defense_team: bestDefenseTeam,
      best_attack_team: bestAttackTeam,
      mvp_name: mvpName,
    })
    .eq("id", 1);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/quiniela-liga");
  return { status: "success", message: "Resultado de la quiniela actualizado." };
}
