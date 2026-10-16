"use server";

import { createClient as createAdmin } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ReenviarState = {
  status: "idle" | "enviado" | "confirmada" | "sin_cuenta" | "error";
  message?: string;
};

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host");
  return `${proto}://${host}`;
}

/**
 * Reenvía el correo de confirmación del registro. Antes miramos el estado
 * del email (migración 066): a quien ya confirmó le mandamos a iniciar
 * sesión, y a quien no tiene cuenta, a registrarse. Así el botón de la
 * página de error ya no lleva al formulario de registro, donde el usuario
 * repetido salía como "ya cogido" y la persona se quedaba atascada.
 */
export async function reenviarConfirmacion(
  _prev: ReenviarState,
  formData: FormData,
): Promise<ReenviarState> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  if (!email.includes("@")) {
    return { status: "error", message: "Introduce un email válido." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const admin = createAdmin(url, key, { auth: { persistSession: false } });
    const { data: estado } = await admin.rpc("estado_email", { p_email: email });
    if (estado === "confirmada") {
      return {
        status: "confirmada",
        message: "Tu cuenta ya está confirmada. Solo tienes que iniciar sesión.",
      };
    }
    if (estado === "sin_cuenta") {
      return {
        status: "sin_cuenta",
        message: "No hay ninguna cuenta con ese email. Revisa que esté bien escrito o crea una.",
      };
    }
  }

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?redirect=%2Fquiniela-liga` },
  });
  if (error) {
    const r = error.message.toLowerCase();
    if (r.includes("security purposes") || r.includes("rate limit") || error.status === 429) {
      return {
        status: "error",
        message: "Acabamos de enviarte uno. Espera un minuto antes de pedir otro.",
      };
    }
    return { status: "error", message: "No pudimos enviar el correo. Inténtalo en un rato." };
  }

  return {
    status: "enviado",
    message: `Te hemos enviado un enlace nuevo a ${email}. Vale durante una hora y solo se puede usar una vez.`,
  };
}
