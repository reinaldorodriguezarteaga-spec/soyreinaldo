"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export type ProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type PasswordState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export type EmailState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const USERNAME_RE = /^[a-z0-9._-]{3,15}$/;
const PHONE_RE = /^\+[1-9][0-9]{7,14}$/;

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host");
  return `${proto}://${host}`;
}

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const displayName = (formData.get("display_name") as string | null)?.trim();
  const usernameRaw = (formData.get("username") as string | null)?.trim() ?? "";
  const username = usernameRaw.toLowerCase();
  const phoneRaw =
    (formData.get("phone_number") as string | null)?.replace(/\s+/g, "") ?? "";

  if (!displayName || displayName.length < 2) {
    return {
      status: "error",
      message: "El nombre debe tener al menos 2 caracteres.",
    };
  }
  if (!username || !USERNAME_RE.test(username)) {
    return {
      status: "error",
      message:
        "Username inválido. Usa 3-15 caracteres, solo letras, números, guión, punto o barra baja.",
    };
  }
  if (phoneRaw && !PHONE_RE.test(phoneRaw)) {
    return {
      status: "error",
      message:
        "Teléfono inválido. Usa el formato internacional, p. ej. +34666123456.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sesión expirada. Vuelve a entrar." };
  }

  // Si cambia el username, comprobamos que no esté cogido por otro
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) {
    return {
      status: "error",
      message: `El usuario "${username}" ya está cogido. Prueba otro.`,
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      phone_number: phoneRaw || null,
    })
    .eq("id", user.id);

  if (profileError) {
    return { status: "error", message: profileError.message };
  }

  await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      username,
      phone_number: phoneRaw || null,
    },
  });

  revalidatePath("/", "layout");
  return { status: "success", message: "Datos actualizados." };
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
    message:
      "Contraseña guardada. La próxima vez puedes entrar con email y contraseña.",
  };
}

export async function updateEmail(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Introduce un email válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sesión expirada. Vuelve a entrar." };
  }
  if (email === user.email) {
    return {
      status: "error",
      message: "Ese ya es tu email actual.",
    };
  }

  const origin = await siteOrigin();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${origin}/auth/callback?redirect=/perfil` },
  );

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: `Te hemos enviado un email a ${email} para confirmar el cambio. Pulsa el enlace y se aplicará. Mientras tanto sigues entrando con el email anterior.`,
  };
}
