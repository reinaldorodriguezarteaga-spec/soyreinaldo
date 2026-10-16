import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Enlaces de los correos de Supabase (confirmar cuenta, enlace mágico,
 * cambio de email, recuperar contraseña) con `token_hash`.
 *
 * El flujo por defecto (`/auth/callback?code=…`, PKCE) solo funciona en el
 * MISMO navegador donde se pidió el correo: guarda allí el "code verifier".
 * Quien se registra dentro de la app (o en el navegador de Instagram) y abre
 * el correo en Chrome o Gmail se encontraba "PKCE code verifier not found"
 * (16-oct, tester de la app). Con `token_hash` el servidor valida el enlace
 * con `verifyOtp` sin depender del navegador.
 *
 * Plantillas de email en Supabase (Authentication → Emails):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<tipo>&next={{ .RedirectTo }}
 * con <tipo> = signup | magiclink | email_change | recovery.
 */
const TIPOS: EmailOtpType[] = [
  "signup",
  "magiclink",
  "email",
  "email_change",
  "recovery",
  "invite",
];

/** Solo rutas de esta web: `next` llega en la URL y no puede mandar fuera. */
function destinoSeguro(next: string | null, origin: string): string {
  if (!next) return "/quiniela";
  try {
    const url = new URL(next, origin);
    if (url.origin !== origin) return "/quiniela";
    // `next` suele ser `/auth/callback?redirect=X` (el emailRedirectTo del
    // registro): saltamos directo a X, que la sesión ya está creada.
    if (url.pathname === "/auth/callback") {
      const r = url.searchParams.get("redirect");
      return r && r.startsWith("/") && !r.startsWith("//") ? r : "/quiniela";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/quiniela";
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = destinoSeguro(searchParams.get("next"), origin);

  if (!tokenHash || !tipo || !TIPOS.includes(tipo)) {
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent("Enlace incompleto.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });

  if (error) {
    // Doble clic o prefetch del cliente de correo: el enlace ya se usó, pero
    // si la sesión está activa, es un éxito.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(`${origin}${destino}`);

    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  // Recuperar contraseña: a poner una nueva.
  if (tipo === "recovery") {
    return NextResponse.redirect(`${origin}/perfil`);
  }
  return NextResponse.redirect(`${origin}${destino}`);
}
