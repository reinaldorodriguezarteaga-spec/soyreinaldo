import { NextResponse } from "next/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { pasada } from "@/lib/rendimiento/ingesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rendimiento por posición (migración 080). Cada hora procesa hasta 60
 * partidos terminados que ya están en el archivo (gratis) y hasta 10 de esta
 * temporada de las competiciones principales que falten (esos sí pueden
 * costar 3-4 llamadas cada uno: ≤ 40 por hora).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  try {
    return NextResponse.json({ ok: true, ...(await pasada(db)) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : JSON.stringify(e) }, { status: 500 });
  }
}
