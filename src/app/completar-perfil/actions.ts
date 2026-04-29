"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CompleteProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const USERNAME_RE = /^[a-z0-9._-]{3,15}$/;
const PHONE_RE = /^\+[1-9][0-9]{7,14}$/;

export async function completeProfile(
  _prev: CompleteProfileState,
  formData: FormData,
): Promise<CompleteProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sesión expirada." };

  const usernameRaw =
    (formData.get("username") as string | null)?.trim() ?? "";
  const username = usernameRaw.toLowerCase();
  const phoneRaw =
    (formData.get("phone_number") as string | null)?.replace(/\s+/g, "") ?? "";
  const wantsReminders = formData.get("wants_reminders") === "on";

  // Cargar perfil actual para saber qué campos faltan
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, phone_number")
    .eq("id", user.id)
    .maybeSingle();

  // Validaciones
  if (username && !USERNAME_RE.test(username)) {
    return {
      status: "error",
      message:
        "Username inválido (3-15 caracteres, solo letras, números, _ - .)",
    };
  }
  if (phoneRaw && !PHONE_RE.test(phoneRaw)) {
    return {
      status: "error",
      message:
        "Teléfono inválido. Formato internacional: +34666123456",
    };
  }

  // Comprobar unicidad de username (si lo está cambiando)
  if (username && username !== profile?.username) {
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    if (taken) {
      return {
        status: "error",
        message: `El usuario "${username}" ya está cogido.`,
      };
    }
  }

  // Construir update con los campos que se van a guardar
  const update: Record<string, string | boolean | null> = {
    wants_reminders: wantsReminders,
  };
  if (username) update.username = username;
  if (phoneRaw) update.phone_number = phoneRaw;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: `El usuario "${username}" ya está cogido.`,
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath("/quiniela");
  revalidatePath("/", "layout");
  return { status: "success", message: "Perfil actualizado." };
}
