import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { canjearCodigo } from "@/lib/apple/siwa";

export const runtime = "nodejs";

/**
 * Tras entrar con Apple en la app, la web manda aquí el código de
 * autorización: se canjea por el refresh token y se guarda para poder
 * revocarlo si el usuario borra su cuenta (`apple_tokens`, migración 107).
 * Solo para el usuario con sesión; si algo falla, el inicio de sesión no se
 * entera (el token se vuelve a pedir la próxima vez que entre con Apple).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { codigo } = (await req.json().catch(() => ({}))) as { codigo?: string };
  if (!codigo || typeof codigo !== "string" || codigo.length > 1000) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ ok: false }, { status: 500 });
  const admin = createAdminClient(url, service, { auth: { persistSession: false } });

  const refresh = await canjearCodigo(admin, codigo);
  if (!refresh) return NextResponse.json({ ok: false });
  await admin
    .from("apple_tokens")
    .upsert({ user_id: user.id, refresh_token: refresh, actualizado: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
