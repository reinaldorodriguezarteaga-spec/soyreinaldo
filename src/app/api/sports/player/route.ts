import { NextResponse } from "next/server";
import { getPlayerExtras, getPlayerSeasonStats } from "@/lib/sports/api-football";

export const runtime = "nodejs";

/**
 * Ficha de un jugador en el Mundial + datos de carrera:
 *   GET /api/sports/player?id=154  → { season: PlayerSeason | null, extras }
 * Usado por el modal de Estadísticas al pulsar un jugador.
 */
export async function GET(req: Request) {
  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "", 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json(null, { status: 400 });
  }
  try {
    const [season, extras] = await Promise.all([
      getPlayerSeasonStats(id),
      getPlayerExtras(id).catch(() => ({ trophies: [], transfers: [], sidelined: [] })),
    ]);
    return NextResponse.json({ season, extras });
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
