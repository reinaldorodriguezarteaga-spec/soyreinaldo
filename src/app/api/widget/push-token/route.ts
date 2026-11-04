import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * La extensión del widget (iOS 26+) manda aquí su token de push para que el
 * servidor pueda pedirle que recargue el marcador en directo (migración 111).
 * No hay sesión: el widget del marcador es el mismo para todos y el token solo
 * sirve para eso. `activo: false` = ya no queda ningún widget puesto.
 */
const TOKEN_RE = /^[0-9a-f]{32,200}$/i;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: string; activo?: boolean }
    | null;
  const token = body?.token?.trim().toLowerCase();
  if (!token || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "token no válido" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "config" }, { status: 500 });
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { error } =
    body?.activo === false
      ? await admin.from("widget_push_tokens").delete().eq("token", token)
      : await admin
          .from("widget_push_tokens")
          .upsert({ token, actualizado: new Date().toISOString() }, { onConflict: "token" });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
