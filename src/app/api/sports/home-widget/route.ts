import { NextResponse } from "next/server";
import { getHomeWidgetData } from "@/lib/sports/widget-data";
import { COMPETITIONS } from "@/lib/sports/competitions";

export const runtime = "nodejs";

/**
 * Endpoint ligero para el widget de marcadores de la PORTADA (LaLiga +
 * Champions League). Paralelo a /api/sports/widget (que sigue siendo
 * exclusivo del Mundial — no tocar). El cliente lo polea cada 20s solo
 * cuando hay un partido en juego o a punto de empezar y la pestaña está
 * visible. Los datos vienen ya cacheados por la librería (unstable_cache) —
 * si el caché es fresco no llama a API-Football.
 */
export async function GET() {
  try {
    const data = await getHomeWidgetData(COMPETITIONS);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { live: [], today: [], recentResults: [], needsPolling: false },
      { status: 200 },
    );
  }
}
