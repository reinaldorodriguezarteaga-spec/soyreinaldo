import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check para monitorización externa (UptimeRobot, etc).
 *
 * - 200 OK + `{ok: true, db: "ok", time}` cuando todo va.
 * - 503 + `{ok: false, db: "error", error}` si la conexión a Supabase falla.
 *
 * UptimeRobot puede:
 *   - vigilar status code (200 vs no-200), o mejor
 *   - usar keyword monitor buscando `"ok":true` (más robusto frente a HTML
 *     de error pintado por una capa intermedia con status 200).
 */
export async function GET() {
  const start = Date.now();
  try {
    const supabase = await createClient();
    // Query barata: solo necesitamos que la conexión y RLS funcionen.
    // `count: "exact", head: true` no descarga filas.
    const { error } = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          db: "error",
          error: error.message,
          ms: Date.now() - start,
          time: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        db: "ok",
        ms: Date.now() - start,
        time: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        error: e instanceof Error ? e.message : "unknown",
        ms: Date.now() - start,
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
