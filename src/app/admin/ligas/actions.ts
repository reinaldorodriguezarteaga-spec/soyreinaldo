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
