import { NextResponse } from "next/server";
import { searchWorldCupPlayers } from "@/lib/sports/api-football";

export const runtime = "nodejs";

/**
 * Búsqueda de jugadores del Mundial por nombre:
 *   GET /api/sports/search-players?q=messi  → PlayerSearchResult[]
 * Usado por el buscador de /mundial/buscar (llamada con debounce desde cliente).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await searchWorldCupPlayers(q));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
