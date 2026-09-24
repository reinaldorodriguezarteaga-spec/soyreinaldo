import { NextResponse } from "next/server";
import { getPlayerExtras, getPlayerSeasonStats } from "@/lib/sports/api-football";
import { WORLD_CUP_2026, competitionFromParams } from "@/lib/sports/competitions";

export const runtime = "nodejs";

/**
 * Ficha de un jugador en una competición + datos de carrera:
 *   GET /api/sports/player?id=154                     → Mundial 2026 (compat)
 *   GET /api/sports/player?id=154&competition=laliga  → esa competición
 * Usado por el modal de Estadísticas al pulsar un jugador.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const id = parseInt(sp.get("id") ?? "", 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json(null, { status: 400 });
  }
  const competition = competitionFromParams(sp) ?? WORLD_CUP_2026;
  try {
    const [season, extras] = await Promise.all([
      getPlayerSeasonStats(id, competition),
      getPlayerExtras(id).catch(() => ({ trophies: [], transfers: [], sidelined: [] })),
    ]);
    return NextResponse.json({ season, extras });
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
