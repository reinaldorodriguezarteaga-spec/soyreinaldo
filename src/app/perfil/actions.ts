"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type PasswordState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateDisplayName(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const displayName = (formData.get("display_name") as string | null)?.trim();

  if (!displayName || displayName.length < 2) {
    return {
      status: "error",
      message: "El nombre debe tener al menos 2 caracteres.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sesión expirada. Vuelve a entrar." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (profileError) {
    return { status: "error", message: profileError.message };
  }

  await supabase.auth.updateUser({ data: { display_name: displayName } });

  revalidatePath("/", "layout");

  return {
    status: "success",
    message: "Nombre actualizado.",
  };
}

export async function updatePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = (formData.get("password") as string | null) ?? "";
  const confirm = (formData.get("confirm") as string | null) ?? "";

  if (password.length < 6) {
    return {
      status: "error",
      message: "La contraseña debe tener al menos 6 caracteres.",
    };
  }
  if (password !== confirm) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sesión expirada. Vuelve a entrar." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: "Contraseña guardada. La próxima vez puedes entrar con email y contraseña.",
  };
}
