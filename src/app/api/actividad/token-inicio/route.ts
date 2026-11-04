import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Token de arranque de las actividades en directo (push-to-start, migración
 * 112). Lo manda la app con la sesión iniciada: el servidor enciende la
 * actividad sola al empezar un partido de un equipo que el usuario siga con
 * avisos «Todo». Mismo patrón que /api/push/dispositivo: un token es del
 * iPhone, y el iPhone de quien tiene la sesión abierta en él.
 */
const TOKEN_RE = /^[0-9a-f]{32,200}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim().toLowerCase();
  if (!token || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "token no válido" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "config" }, { status: 500 });
  const admin = createAdmin(url, key, { auth: { persistSession: false } });
  const { error } = await admin
    .from("la_tokens_inicio")
    .upsert(
      { token, user_id: user.id, actualizado: new Date().toISOString() },
      { onConflict: "token" },
    );
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
