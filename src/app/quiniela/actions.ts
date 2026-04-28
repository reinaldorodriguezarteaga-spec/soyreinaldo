"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type JoinLeagueState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function joinLeague(
  _prev: JoinLeagueState,
  formData: FormData,
): Promise<JoinLeagueState> {
  const code = (formData.get("code") as string | null)?.trim();

  if (!code || code.length < 4) {
    return {
      status: "error",
      message: "Introduce un código válido.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Tienes que iniciar sesión.",
    };
  }

  const { error } = await supabase.rpc("join_league_by_code", {
    p_code: code,
  });

  if (error) {
    if (error.message?.includes("no existe")) {
      return {
        status: "error",
        message: `El código "${code.toUpperCase()}" no existe.`,
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath("/quiniela");
  return {
    status: "success",
    message: "¡Estás dentro!",
  };
}

export async function leaveLeague(formData: FormData) {
  const leagueId = formData.get("league_id") as string;
  if (!leagueId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", user.id);

  revalidatePath("/quiniela");
}
