import { NextResponse } from "next/server";
import { getWidgetData } from "@/lib/sports/widget-data";

export const runtime = "nodejs";

/**
 * Endpoint ligero que devuelve el estado del widget de marcadores.
 * El cliente lo polea cada 30s solo cuando hay un partido en juego o a punto
 * de empezar y la pestaña está visible. Los datos vienen ya cacheados por la
 * librería (next.revalidate) — si el caché es fresco no llama a API-Football.
 */
export async function GET() {
  try {
    const data = await getWidgetData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { mode: "clubs", fixtures: [], needsPolling: false },
      { status: 200 },
    );
  }
}
