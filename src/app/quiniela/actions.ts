"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

/**
 * Acción unificada para unirse a una liga vía código. Cubre tanto el flujo
 * de ligas públicas (code viene de hidden input renderizado por el server)
 * como el de privadas (code viene de un input que rellena el usuario).
 *
 * El RPC `join_league_by_code` devuelve la fila league_members con el
 * league_id correspondiente al code → la usamos para redirigir al ranking
 * correcto, sin pasar league_id explícito.
 *
 * Idempotente: si ya eres miembro, ON CONFLICT DO NOTHING y termina en el
 * ranking igualmente.
 */
export async function joinLeagueByCode(formData: FormData) {
  const code = (formData.get("code") as string | null)?.trim();
  if (!code) {
    redirect("/quiniela?join_error=" + encodeURIComponent("Falta el código."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/quiniela`);
  }

  const { data, error } = await supabase.rpc("join_league_by_code", {
    p_code: code!,
  });

  if (error) {
    redirect(
      `/quiniela?join_error=${encodeURIComponent(error.message)}`,
    );
  }

  const leagueId = (data as { league_id?: string } | null)?.league_id;
  revalidatePath("/quiniela");
  redirect(
    leagueId
      ? `/quiniela/ranking/${leagueId}?bienvenida=1`
      : "/quiniela",
  );
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
