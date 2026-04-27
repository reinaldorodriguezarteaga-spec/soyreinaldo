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

export async function signUp(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const displayName = (formData.get("display_name") as string | null)?.trim();
  const password = (formData.get("password") as string | null) ?? "";
  const confirm = (formData.get("confirm") as string | null) ?? "";

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Introduce un email válido." };
  }
  if (!displayName || displayName.length < 2) {
    return {
      status: "error",
      message: "Tu nombre debe tener al menos 2 caracteres.",
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

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?redirect=/quiniela`,
      data: { display_name: displayName },
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  // If Supabase has email confirmations on, the session is null; user must
  // click the link in the email. Otherwise we can already have a session.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/quiniela");
  }

  return {
    status: "success",
    message: `Te hemos enviado un email a ${email} para confirmar la cuenta. Pulsa el enlace y entrarás a la quiniela.`,
  };
}
