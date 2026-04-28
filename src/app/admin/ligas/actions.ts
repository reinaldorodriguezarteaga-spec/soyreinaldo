"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CreateLeagueState = {
  status: "idle" | "success" | "error";
  message?: string;
};

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
  return { supabase, user };
}

export async function createLeague(
  _prev: CreateLeagueState,
  formData: FormData,
): Promise<CreateLeagueState> {
  const name = (formData.get("name") as string | null)?.trim();
  const code = (formData.get("code") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim();

  if (!name || name.length < 2) {
    return {
      status: "error",
      message: "El nombre debe tener al menos 2 caracteres.",
    };
  }
  if (!code || code.length < 4) {
    return {
      status: "error",
      message: "El código debe tener al menos 4 caracteres.",
    };
  }
  if (!/^[A-Za-z0-9-]+$/.test(code)) {
    return {
      status: "error",
      message: "El código solo puede contener letras, números y guiones.",
    };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("leagues").insert({
    name,
    code, // se normaliza a mayúsculas en el trigger
    description: description || null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: `El código "${code.toUpperCase()}" ya existe. Elige otro.`,
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/ligas");
  return {
    status: "success",
    message: `Liga "${name}" creada con código ${code.toUpperCase()}.`,
  };
}

export async function deleteLeague(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const { supabase } = await requireAdmin();
  await supabase.from("leagues").delete().eq("id", id);
  revalidatePath("/admin/ligas");
}

// ---------------------------------------------------------------------------
// League detail actions (used in /admin/ligas/[id])
// ---------------------------------------------------------------------------

export type UpdateLeagueState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateLeague(
  _prev: UpdateLeagueState,
  formData: FormData,
): Promise<UpdateLeagueState> {
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string | null)?.trim();
  const code = (formData.get("code") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim();

  if (!id) return { status: "error", message: "Liga no encontrada." };
  if (!name || name.length < 2) {
    return { status: "error", message: "Nombre demasiado corto." };
  }
  if (!code || code.length < 4 || !/^[A-Za-z0-9-]+$/.test(code)) {
    return {
      status: "error",
      message: "Código inválido (mín. 4 caracteres, solo letras/números/guiones).",
    };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("leagues")
    .update({
      name,
      code,
      description: description || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: `Ya existe otra liga con el código ${code.toUpperCase()}.`,
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath(`/admin/ligas/${id}`);
  revalidatePath("/admin/ligas");
  return { status: "success", message: "Cambios guardados." };
}

export async function kickMember(formData: FormData) {
  const leagueId = formData.get("league_id") as string;
  const userId = formData.get("user_id") as string;
  if (!leagueId || !userId) return;

  const { supabase } = await requireAdmin();
  await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);

  revalidatePath(`/admin/ligas/${leagueId}`);
}

export type AdjustmentState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addAdjustment(
  _prev: AdjustmentState,
  formData: FormData,
): Promise<AdjustmentState> {
  const leagueId = formData.get("league_id") as string;
  const userId = formData.get("user_id") as string;
  const deltaRaw = formData.get("delta") as string | null;
  const reason = (formData.get("reason") as string | null)?.trim();

  if (!leagueId || !userId) {
    return { status: "error", message: "Datos incompletos." };
  }
  const delta = Number.parseInt(deltaRaw ?? "", 10);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000) {
    return {
      status: "error",
      message: "El ajuste debe ser un número entero distinto de 0.",
    };
  }
  if (!reason || reason.length < 3) {
    return {
      status: "error",
      message: "Escribe un motivo (mín. 3 caracteres).",
    };
  }

  const { supabase, user } = await requireAdmin();
  const { error } = await supabase.from("point_adjustments").insert({
    league_id: leagueId,
    user_id: userId,
    delta,
    reason,
    created_by: user.id,
  });

  if (error) return { status: "error", message: error.message };

  revalidatePath(`/admin/ligas/${leagueId}`);
  return {
    status: "success",
    message: `Ajuste de ${delta > 0 ? "+" : ""}${delta} aplicado.`,
  };
}

export async function deleteAdjustment(formData: FormData) {
  const id = formData.get("id") as string;
  const leagueId = formData.get("league_id") as string;
  if (!id) return;

  const { supabase } = await requireAdmin();
  await supabase.from("point_adjustments").delete().eq("id", id);
  if (leagueId) revalidatePath(`/admin/ligas/${leagueId}`);
}
