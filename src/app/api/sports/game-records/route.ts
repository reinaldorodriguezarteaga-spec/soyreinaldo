import { NextResponse } from "next/server";
import {
  getGameRecords,
  getCompetitionFinishedFixtures,
} from "@/lib/sports/api-football";
import { WORLD_CUP_2026, competitionFromParams } from "@/lib/sports/competitions";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Récords de juego de una competición (más posesión, más tiros, más tiros a
 * puerta), agregando las estadísticas de todos los partidos terminados. Se
 * sirve bajo demanda desde la pestaña Estadísticas para no bloquear su render.
 *   GET /api/sports/game-records                     → Mundial 2026 (compat)
 *   GET /api/sports/game-records?competition=laliga  → esa competición
 */
export async function GET(req: Request) {
  const competition =
    competitionFromParams(new URL(req.url).searchParams) ?? WORLD_CUP_2026;
  try {
    const finished = await getCompetitionFinishedFixtures(competition);
    return NextResponse.json(await getGameRecords(finished));
  } catch {
    return NextResponse.json(
      { topPossession: null, topShots: null, topShotsOnTarget: null },
      { status: 200 },
    );
  }
}
