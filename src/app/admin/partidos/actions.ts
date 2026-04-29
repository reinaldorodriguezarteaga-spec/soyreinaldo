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

export type SaveResultState =
  | { status: "idle" }
  | { status: "success"; matchId: number }
  | { status: "error"; message: string };

function parseScore(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 99) return NaN;
  return n;
}

export async function saveMatchResult(
  _prev: SaveResultState,
  formData: FormData,
): Promise<SaveResultState> {
  const matchId = Number.parseInt(
    (formData.get("match_id") as string) ?? "",
    10,
  );
  if (!Number.isInteger(matchId)) {
    return { status: "error", message: "Partido no válido." };
  }
  const home = parseScore(formData.get("score_home") as string | null);
  const away = parseScore(formData.get("score_away") as string | null);
  const finished = formData.get("finished") === "on";

  if (home !== null && Number.isNaN(home)) {
    return { status: "error", message: "Goles local fuera de rango." };
  }
  if (away !== null && Number.isNaN(away)) {
    return { status: "error", message: "Goles visitante fuera de rango." };
  }
  if (finished && (home === null || away === null)) {
    return {
      status: "error",
      message: "Marca el resultado antes de finalizar.",
    };
  }

  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("matches")
    .update({
      score_home: home,
      score_away: away,
      finished,
    })
    .eq("id", matchId);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/admin/partidos");
  return { status: "success", matchId };
}

/**
 * Llama a la función SQL resolve_r32() y devuelve cuántos slots resolvió.
 * Solo rellena placeholders directos (1A, 2B, 3C...) y solo si todos los
 * partidos del grupo correspondiente están finalizados. Los placeholders
 * compuestos como "3A/B/C/D/F" se asignan a mano desde /admin/bracket-manual.
 */
export async function resolveR32Action(): Promise<{
  ok: boolean;
  resolved: number;
  message?: string;
}> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.rpc("resolve_r32");
  if (error) {
    return { ok: false, resolved: 0, message: error.message };
  }
  revalidatePath("/admin/partidos");
  revalidatePath("/quiniela/bracket");
  return { ok: true, resolved: (data as number) ?? 0 };
}

/**
 * Resolves the team for a knockout slot once it's known. The admin types e.g.
 * "ESP" into a placeholder slot like "1H" and we set team_home or team_away.
 */
export async function setKnockoutTeam(formData: FormData) {
  const matchId = Number.parseInt(
    (formData.get("match_id") as string) ?? "",
    10,
  );
  const side = formData.get("side") as "home" | "away";
  const teamId = ((formData.get("team_id") as string) || "").trim();

  if (
    !Number.isInteger(matchId) ||
    (side !== "home" && side !== "away") ||
    !/^[A-Z]{3}$/.test(teamId)
  ) {
    return;
  }

  const supabase = await requireAdmin();
  await supabase
    .from("matches")
    .update(side === "home" ? { team_home: teamId } : { team_away: teamId })
    .eq("id", matchId);

  revalidatePath("/admin/partidos");
}
