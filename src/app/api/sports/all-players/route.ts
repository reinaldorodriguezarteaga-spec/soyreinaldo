import { NextResponse } from "next/server";
import { getAllWorldCupPlayers } from "@/lib/sports/api-football";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Listado alfabético de TODOS los jugadores del Mundial (unión de las 48
 * plantillas). Se sirve bajo demanda al abrir la pestaña "Jugadores".
 *   GET /api/sports/all-players  → AllPlayer[]
 */
export async function GET() {
  try {
    return NextResponse.json(await getAllWorldCupPlayers());
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
