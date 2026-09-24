import { NextResponse } from "next/server";
import { getAllCompetitionPlayers } from "@/lib/sports/api-football";
import { WORLD_CUP_2026, competitionFromParams } from "@/lib/sports/competitions";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Listado alfabético de TODOS los jugadores de una competición (unión de las
 * plantillas). Se sirve bajo demanda al abrir la pestaña "Jugadores".
 *   GET /api/sports/all-players               → Mundial 2026 (compat, sin tocar /mundial)
 *   GET /api/sports/all-players?competition=laliga  → esa competición
 */
export async function GET(req: Request) {
  const competition =
    competitionFromParams(new URL(req.url).searchParams) ?? WORLD_CUP_2026;
  try {
    return NextResponse.json(await getAllCompetitionPlayers(competition));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
