"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthState = {
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

export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const redirectTarget =
    (formData.get("redirect") as string | null) ?? "/quiniela";

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Introduce un email válido." };
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(
        redirectTarget,
      )}`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: `Te hemos enviado un email a ${email} con el enlace para entrar.`,
  };
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = (formData.get("password") as string | null) ?? "";
  const redirectTarget =
    (formData.get("redirect") as string | null) ?? "/quiniela";

  if (!email || !email.includes("@") || password.length < 6) {
    return {
      status: "error",
      message:
        "Email o contraseña inválidos. La contraseña debe tener al menos 6 caracteres.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/", "layout");
  redirect(redirectTarget);
}

export async function signInWithGoogle(formData: FormData) {
  const redirectTarget =
    (formData.get("redirect") as string | null) ?? "/quiniela";

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(
        redirectTarget,
      )}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data?.url) {
    redirect(
      `/auth/error?reason=${encodeURIComponent(
        error?.message ?? "No se pudo iniciar sesión con Google.",
      )}`,
    );
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
