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
 * Unirse a una liga pública con 1 click — sin necesidad de teclear el código.
 * El formulario lleva el code y league_id como hidden inputs. Tras unirse,
 * redirige al ranking con `?bienvenida=1` para que se muestre el banner.
 *
 * Idempotente: si ya eres miembro, el RPC join_league_by_code no inserta
 * nada (ON CONFLICT DO NOTHING) y el redirect lleva al ranking normalmente.
 */
export async function joinPublicLeague(formData: FormData) {
  const code = (formData.get("code") as string | null)?.trim();
  const leagueId = (formData.get("league_id") as string | null)?.trim();
  if (!code || !leagueId) {
    redirect("/quiniela");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/quiniela`);
  }

  const { error } = await supabase.rpc("join_league_by_code", {
    p_code: code,
  });

  if (error) {
    redirect(
      `/quiniela?join_error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/quiniela");
  redirect(`/quiniela/ranking/${leagueId}?bienvenida=1`);
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
