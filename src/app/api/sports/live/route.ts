import { NextResponse } from "next/server";
import { getLiveNow } from "@/lib/sports/live-now";

export const runtime = "nodejs";

/**
 * Partidos en juego ahora mismo, de todas las competiciones.
 *   GET /api/sports/live → { grupos: LiveGroup[] }
 * Lo consume el auto-refresco de /en-vivo. Se apoya en la misma caché que la
 * portada, así que no dispara llamadas nuevas a API-Football.
 */
export async function GET() {
  try {
    return NextResponse.json({ grupos: await getLiveNow() });
  } catch {
    return NextResponse.json({ grupos: [] });
  }
}
