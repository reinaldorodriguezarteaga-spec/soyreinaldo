import { NextResponse } from "next/server";
import {
  getGameRecords,
  getWorldCupFinishedFixtures,
} from "@/lib/sports/api-football";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Récords de juego del Mundial (más posesión, más tiros, más tiros a puerta),
 * agregando las estadísticas de todos los partidos terminados. Se sirve bajo
 * demanda desde la pestaña Estadísticas para no bloquear su render.
 *   GET /api/sports/game-records  → GameRecords
 */
export async function GET() {
  try {
    const finished = await getWorldCupFinishedFixtures();
    return NextResponse.json(await getGameRecords(finished));
  } catch {
    return NextResponse.json(
      { topPossession: null, topShots: null, topShotsOnTarget: null },
      { status: 200 },
    );
  }
}
