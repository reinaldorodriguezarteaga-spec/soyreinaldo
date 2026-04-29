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
  const identifier =
    (formData.get("identifier") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const redirectTarget =
    (formData.get("redirect") as string | null) ?? "/quiniela";

  if (!identifier || password.length < 6) {
    return {
      status: "error",
      message:
        "Email/usuario o contraseña inválidos. La contraseña debe tener al menos 6 caracteres.",
    };
  }

  const supabase = await createClient();

  // Si el identifier no parece un email, asumimos username y resolvemos su
  // email a través del RPC público
  let email = identifier.toLowerCase();
  if (!email.includes("@")) {
    const { data, error: rpcError } = await supabase.rpc(
      "lookup_email_by_username",
      { p_username: email },
    );
    if (rpcError || !data) {
      return {
        status: "error",
        message: "Usuario o contraseña incorrectos.",
      };
    }
    email = data as string;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: "Usuario o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTarget);
}

type OAuthProvider = "google" | "facebook";

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

export async function signInWithOAuthProvider(formData: FormData) {
  const provider = (formData.get("provider") as OAuthProvider | null) ?? "google";
  const redirectTarget =
    (formData.get("redirect") as string | null) ?? "/quiniela";

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(
        redirectTarget,
      )}`,
      ...(provider === "google" && {
        queryParams: { access_type: "offline", prompt: "consent" },
      }),
    },
  });

  if (error || !data?.url) {
    redirect(
      `/auth/error?reason=${encodeURIComponent(
        error?.message ??
          `No se pudo iniciar sesión con ${PROVIDER_LABELS[provider]}.`,
      )}`,
    );
  }

  redirect(data.url);
}

// Backwards-compatible alias kept so existing imports keep working.
export const signInWithGoogle = signInWithOAuthProvider;

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
