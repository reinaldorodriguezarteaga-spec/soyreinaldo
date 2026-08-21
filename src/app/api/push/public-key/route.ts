import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Clave pública VAPID: el navegador la necesita para suscribirse. Es pública
 * por diseño — su pareja privada se queda en el Vault. */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("push_vapid_public_key");
  if (error || !data) {
    return NextResponse.json({ error: "sin claves" }, { status: 503 });
  }
  return NextResponse.json({ key: data as string });
}
