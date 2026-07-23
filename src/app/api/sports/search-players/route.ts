import { NextResponse } from "next/server";
import { searchCompetitionPlayers } from "@/lib/sports/api-football";
import { WORLD_CUP_2026, COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

export const runtime = "nodejs";

/**
 * Búsqueda de jugadores de una competición por nombre:
 *   GET /api/sports/search-players?q=messi                     → Mundial 2026 (compat)
 *   GET /api/sports/search-players?q=messi&competition=laliga  → esa competición
 * Usado por los buscadores de /mundial/buscar y /liga/[slug]/buscar (debounce cliente).
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? "";
  const slug = sp.get("competition");
  const competition = (slug && COMPETITIONS_BY_SLUG[slug]) || WORLD_CUP_2026;
  try {
    return NextResponse.json(await searchCompetitionPlayers(q, competition));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
