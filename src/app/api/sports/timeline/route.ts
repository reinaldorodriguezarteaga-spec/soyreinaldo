import { NextResponse } from "next/server";
import { getFixtureTimeline } from "@/lib/sports/api-football";

export const runtime = "nodejs";

/**
 * Cronología de eventos de un partido:
 *   GET /api/sports/timeline?fixture=123  → TimelineEvent[]
 * Se sirve bajo demanda al abrir la pestaña "Cronología" del detalle.
 */
export async function GET(req: Request) {
  const fixture = Number(new URL(req.url).searchParams.get("fixture"));
  if (!Number.isFinite(fixture)) {
    return NextResponse.json([], { status: 400 });
  }
  try {
    return NextResponse.json(await getFixtureTimeline(fixture));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
