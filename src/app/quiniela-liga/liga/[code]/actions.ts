"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Acciones del panel de una liga privada de la quiniela de clubes. Quién
 * puede hacer qué lo decide la BD (policies + `league_admin_update_meta`,
 * migración 035), no este archivo: aquí solo se valida la forma de los datos
 * y se traduce el error a algo legible.
 */
export type LeagueFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const DENIED = "No tienes permisos para esto en esta liga.";

function readableError(message: string): string {
  if (/42501|permis|no mandas/i.test(message)) return DENIED;
  if (/row-level security|policy|violates/i.test(message)) return DENIED;
  return message;
}

export async function updateLeagueMeta(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const leagueId = formData.get("league_id") as string | null;
  const name = (formData.get("name") as string | null)?.trim();
  const code = (formData.get("code") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim();

  if (!leagueId) return { status: "error", message: "Liga no encontrada." };
  if (!name || name.length < 2) {
    return { status: "error", message: "El nombre debe tener al menos 2 caracteres." };
  }
  if (!code || code.length < 4 || !/^[A-Za-z0-9-]+$/.test(code)) {
    return {
      status: "error",
      message: "Código inválido: mínimo 4 caracteres, solo letras, números o guiones.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("league_admin_update_meta", {
    p_league_id: leagueId,
    p_name: name,
    p_description: description || null,
    p_code: code,
  });

  if (error) {
    if (error.code === "23505" || /ya existe otra liga/i.test(error.message)) {
      return {
        status: "error",
        message: `Ya hay otra liga con el código ${code.toUpperCase()}. Elige otro.`,
      };
    }
    return { status: "error", message: readableError(error.message) };
  }

  const newCode = code.toUpperCase();
  revalidatePath(`/quiniela-liga/liga/${newCode}`);
  revalidatePath("/quiniela-liga/ranking");
  // El código va en la URL: si ha cambiado, la ruta antigua ya no existe.
  redirect(`/quiniela-liga/liga/${encodeURIComponent(newCode)}?guardado=1`);
}

/** Expulsar a un miembro. La RLS impide echar a otro admin. */
export async function kickMember(formData: FormData) {
  const leagueId = formData.get("league_id") as string | null;
  const userId = formData.get("user_id") as string | null;
  const code = formData.get("code") as string | null;
  if (!leagueId || !userId) return;

  const supabase = await createClient();
  await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);

  if (code) revalidatePath(`/quiniela-liga/liga/${code}`);
  revalidatePath("/quiniela-liga/ranking");
}

export async function addAdjustment(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const leagueId = formData.get("league_id") as string | null;
  const userId = formData.get("user_id") as string | null;
  const code = formData.get("code") as string | null;
  const delta = Number.parseInt((formData.get("delta") as string | null) ?? "", 10);
  const reason = (formData.get("reason") as string | null)?.trim();

  if (!leagueId || !userId) return { status: "error", message: "Elige a un jugador." };
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000) {
    return { status: "error", message: "El ajuste debe ser un entero distinto de 0." };
  }
  if (!reason || reason.length < 3) {
    return { status: "error", message: "Escribe un motivo (mín. 3 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Inicia sesión." };

  const { error } = await supabase.from("point_adjustments").insert({
    league_id: leagueId,
    user_id: userId,
    delta,
    reason,
    created_by: user.id,
  });

  if (error) return { status: "error", message: readableError(error.message) };

  if (code) revalidatePath(`/quiniela-liga/liga/${code}`);
  revalidatePath("/quiniela-liga/ranking");
  return {
    status: "success",
    message: `Ajuste de ${delta > 0 ? "+" : ""}${delta} aplicado.`,
  };
}

export async function deleteAdjustment(formData: FormData) {
  const id = formData.get("id") as string | null;
  const code = formData.get("code") as string | null;
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("point_adjustments").delete().eq("id", id);

  if (code) revalidatePath(`/quiniela-liga/liga/${code}`);
  revalidatePath("/quiniela-liga/ranking");
}

/** Baremo de la liga (migración 037). Solo su admin — o el admin global. */
export async function updateLeagueRules(
  _prev: LeagueFormState,
  formData: FormData,
): Promise<LeagueFormState> {
  const leagueId = formData.get("league_id") as string | null;
  const code = formData.get("code") as string | null;
  if (!leagueId) return { status: "error", message: "Liga no encontrada." };

  const num = (key: string) => {
    const n = Number.parseInt((formData.get(key) as string | null) ?? "", 10);
    return Number.isInteger(n) && n >= 0 && n <= 100 ? n : null;
  };
  const values = {
    p_exact: num("exact"),
    p_result: num("result"),
    p_champion: num("champion"),
    p_pichichi: num("pichichi"),
    p_relegated: num("relegated"),
    p_midseason: num("midseason"),
  };
  if (Object.values(values).some((v) => v === null)) {
    return { status: "error", message: "Los puntos deben ser enteros entre 0 y 100." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("league_admin_update_rules", {
    p_league_id: leagueId,
    ...values,
    p_specials: formData.get("specials") === "on",
  });

  if (error) return { status: "error", message: readableError(error.message) };

  if (code) revalidatePath(`/quiniela-liga/liga/${code}`);
  revalidatePath("/quiniela-liga/ranking");
  return { status: "success", message: "Normas actualizadas." };
}
