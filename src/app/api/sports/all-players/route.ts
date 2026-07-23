import { NextResponse } from "next/server";
import { getAllCompetitionPlayers } from "@/lib/sports/api-football";
import { WORLD_CUP_2026, COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Listado alfabético de TODOS los jugadores de una competición (unión de las
 * plantillas). Se sirve bajo demanda al abrir la pestaña "Jugadores".
 *   GET /api/sports/all-players               → Mundial 2026 (compat, sin tocar /mundial)
 *   GET /api/sports/all-players?competition=laliga  → esa competición
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("competition");
  const competition = (slug && COMPETITIONS_BY_SLUG[slug]) || WORLD_CUP_2026;
  try {
    return NextResponse.json(await getAllCompetitionPlayers(competition));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
