import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const redirectTarget = searchParams.get("redirect") ?? "/quiniela";

  // Supabase forwards errors as query params (expired/invalid link, etc.)
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent(
        errorDescription ?? errorParam,
      )}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Tolerate prefetch / double-click race: if the code was already
      // consumed but the session is active, treat it as success.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return NextResponse.redirect(`${origin}${redirectTarget}`);
      }

      // DIAGNÓSTICO temporal: por qué falla el intercambio del code (PKCE).
      // El User-Agent revela si es un navegador in-app (Instagram/FB/etc.),
      // que es la causa típica de que falte la cookie del code verifier.
      const ua = request.headers.get("user-agent") ?? "";
      console.error("[auth/callback] exchange failed", {
        reason: error.message,
        hasCode: !!code,
        host: searchParams.get("host") ?? new URL(request.url).host,
        ua,
        inApp: /instagram|fban|fbav|fb_iab|line\/|micromessenger|whatsapp|tiktok/i.test(
          ua,
        ),
      });

      return NextResponse.redirect(
        `${origin}/auth/error?reason=${encodeURIComponent(error.message)}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${redirectTarget}`);
}
