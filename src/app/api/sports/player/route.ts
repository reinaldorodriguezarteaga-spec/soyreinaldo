import { NextResponse } from "next/server";
import { getPlayerSeasonStats } from "@/lib/sports/api-football";

export const runtime = "nodejs";

/**
 * Estadísticas agregadas de un jugador en el Mundial:
 *   GET /api/sports/player?id=154  → PlayerSeason | null
 * Usado por las tablas de Estadísticas al pulsar un jugador.
 */
export async function GET(req: Request) {
  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json(null, { status: 400 });
  }
  try {
    return NextResponse.json(await getPlayerSeasonStats(id));
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
