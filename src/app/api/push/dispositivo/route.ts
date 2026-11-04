import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Alta y baja de un móvil en los avisos nativos (app 1.1: iPhone por
 * APNs; desde el 4-nov también Android por FCM, con `plataforma`). Mismo patrón
 * que /api/push/subscribe: hace falta sesión (los avisos van por los
 * favoritos del usuario) y la RLS de `push_dispositivos` impide tocar los
 * de otro. */

// Los tokens de APNs son hexadecimales (64 caracteres hoy; Apple avisa de
// que pueden crecer). Los de FCM, base64url con «:» (unos 160).
const TOKEN_RE = /^[0-9a-f]{32,200}$/i;
const TOKEN_FCM_RE = /^[A-Za-z0-9_:\-]{100,400}$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { token?: string; plataforma?: string }
    | null;
  const token = body?.token?.trim();
  const plataforma = body?.plataforma === "android" ? "android" : "ios";
  if (!token || !(plataforma === "android" ? TOKEN_FCM_RE : TOKEN_RE).test(token)) {
    return NextResponse.json({ error: "token no válido" }, { status: 400 });
  }

  // Un token es de un iPhone, y el iPhone es de quien tiene la sesión abierta
  // en él: si antes era de otra cuenta, pasa a esta. Esa reasignación la
  // frenaría la RLS (la fila es de otro), así que la hace el servidor con la
  // service role, siempre con el usuario ya comprobado arriba.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "config" }, { status: 500 });
  const admin = createAdmin(url, key, { auth: { persistSession: false } });
  const { error } = await admin
    .from("push_dispositivos")
    .upsert({ token, user_id: user.id, plataforma }, { onConflict: "token" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { token } = ((await request.json().catch(() => ({}))) ?? {}) as { token?: string };
  if (!token) return NextResponse.json({ error: "falta token" }, { status: 400 });
  await supabase.from("push_dispositivos").delete().eq("token", token);
  return NextResponse.json({ ok: true });
}
