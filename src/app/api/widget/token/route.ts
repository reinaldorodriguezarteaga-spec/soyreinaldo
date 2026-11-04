import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * La llave del widget «Clasificación» para el usuario con sesión (la crea
 * la primera vez). La pide la web dentro de la app para guardarla en el
 * iPhone, donde la lee el widget. Ver migración 108.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ token: null }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ token: null }, { status: 500 });
  const admin = createAdminClient(url, service, { auth: { persistSession: false } });

  const { data: ya } = await admin
    .from("widget_tokens")
    .select("token")
    .eq("user_id", user.id)
    .maybeSingle<{ token: string }>();
  if (ya) return NextResponse.json({ token: ya.token });
  const { data: nuevo } = await admin
    .from("widget_tokens")
    .insert({ user_id: user.id })
    .select("token")
    .single<{ token: string }>();
  return NextResponse.json({ token: nuevo?.token ?? null });
}
