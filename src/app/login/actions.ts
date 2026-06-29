"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";
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

/**
 * Envía un CÓDIGO de acceso por email (para la app). Genera el OTP por el lado
 * servidor (admin.generateLink, que NO manda email) y lo envía con un correo
 * propio vía Resend — así no dependemos de que la plantilla de Supabase incluya
 * {{ .Token }}. Anti-enumeración: responde igual aunque la cuenta no exista.
 */
export async function sendEmailCode(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Introduce un email válido." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!url || !serviceKey || !resendKey) {
    return { status: "error", message: "No se pudo enviar el código ahora mismo." };
  }

  const genericOk: AuthState = {
    status: "success",
    message: "Si esa cuenta existe, te enviamos un código. Revisa tu email (y spam).",
  };

  const admin = createAdminClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const code = data?.properties?.email_otp;
  if (error || !code) return genericOk; // cuenta inexistente → no revelamos

  const resend = new Resend(resendKey);
  try {
    await resend.emails.send({
      from: "Reinaldo <hola@soyreinaldo.com>",
      to: email,
      subject: "Tu código para entrar a Soy Reinaldo",
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;background:#0a1030;color:#e8ecff;padding:32px;border-radius:16px;max-width:420px;margin:auto">
  <h2 style="margin:0 0 8px;font-size:20px">Tu código de acceso</h2>
  <p style="color:#8a93b8;margin:0 0 20px;font-size:14px">Escríbelo en la app para entrar. Caduca en unos minutos.</p>
  <p style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#2c8fff;margin:0">${code}</p>
  <p style="color:#8a93b8;margin:24px 0 0;font-size:12px">Si no fuiste tú, ignora este correo.</p>
</div>`,
    });
  } catch {
    return { status: "error", message: "No se pudo enviar el código. Inténtalo de nuevo." };
  }

  return {
    status: "success",
    message: "Te enviamos un código. Revisa tu email (y spam).",
  };
}

/**
 * Verifica el código del email (flujo OTP para la APP, donde el
 * enlace mágico se abriría en Safari y no en el webview). Funciona para
 * cualquier usuario existente —incluidos los que se registraron con Google—
 * porque Supabase identifica por email. Requiere que la plantilla de email de
 * Supabase incluya {{ .Token }}.
 */
export async function verifyEmailCode(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const token = (formData.get("token") as string | null)?.replace(/\D/g, "") ?? "";
  const redirectTarget =
    (formData.get("redirect") as string | null) ?? "/quiniela";

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Falta el email. Vuelve a empezar." };
  }
  if (!/^\d{6,10}$/.test(token)) {
    return {
      status: "error",
      message: "Escribe el código numérico que te llegó por email.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) {
    return {
      status: "error",
      message: "Código incorrecto o caducado. Pide uno nuevo.",
    };
  }

  redirect(redirectTarget);
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
    return {
      status: "error",
      message:
        "Usuario o contraseña incorrectos. Si te registraste con Google, entra con el botón de Google de arriba — esas cuentas no tienen contraseña.",
    };
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
