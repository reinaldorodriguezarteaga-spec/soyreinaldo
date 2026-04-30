"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type SignupState = {
  status: "idle" | "success" | "error";
  message?: string;
};

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host");
  return `${proto}://${host}`;
}

const USERNAME_RE = /^[a-z0-9._-]{3,15}$/;
const PHONE_RE = /^\+[1-9][0-9]{7,14}$/;

export async function signUp(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const displayName = (formData.get("display_name") as string | null)?.trim();
  const usernameRaw = (formData.get("username") as string | null)?.trim() ?? "";
  const username = usernameRaw.toLowerCase();
  const phoneRaw =
    (formData.get("phone_number") as string | null)?.replace(/\s+/g, "") ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const confirm = (formData.get("confirm") as string | null) ?? "";
  const redirectTarget =
    (formData.get("redirect") as string | null) ?? "/quiniela";

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Introduce un email válido." };
  }
  if (!displayName || displayName.length < 2) {
    return {
      status: "error",
      message: "Tu nombre debe tener al menos 2 caracteres.",
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
      message: "Teléfono inválido. Usa el formato internacional, p. ej. +34666123456.",
    };
  }
  if (password.length < 6) {
    return {
      status: "error",
      message: "La contraseña debe tener al menos 6 caracteres.",
    };
  }
  if (password !== confirm) {
    return { status: "error", message: "Las contraseñas no coinciden." };
  }

  // Comprobar antes de llamar a signUp si el username ya existe
  const supabase = await createClient();
  const { data: takenRow } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (takenRow) {
    return {
      status: "error",
      message: `El usuario "${username}" ya está cogido. Prueba otro.`,
    };
  }

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(
        redirectTarget,
      )}`,
      data: {
        display_name: displayName,
        username,
        phone_number: phoneRaw || null,
      },
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  // If Supabase has email confirmations on, the session is null; user must
  // click the link in the email. Otherwise we can already have a session.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(redirectTarget);
  }

  return {
    status: "success",
    message: `Te hemos enviado un email a ${email} para confirmar la cuenta. Pulsa el enlace y entrarás a la quiniela.`,
  };
}
