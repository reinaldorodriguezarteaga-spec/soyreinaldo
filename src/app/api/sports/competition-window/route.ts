import { NextResponse } from "next/server";
import { getCompetitionFixturesWindow } from "@/lib/sports/api-football";
import { attachEvents } from "@/lib/sports/widget-data";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

export const runtime = "nodejs";

/**
 * Partidos "de hoy" (en juego, o con kickoff en la ventana ±horas) de una
 * competición del árbol /liga/[slug], con goles/expulsiones adjuntos. Es el
 * equivalente genérico de /api/sports/widget (que sigue siendo exclusivo del
 * Mundial/portada) — lo usa la pestaña "Marcador en vivo" de /liga/[slug]
 * para poleo en cliente sin recargar toda la página.
 *   GET /api/sports/competition-window?slug=laliga  → { fixtures: WcFixture[] }
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) {
    return NextResponse.json({ fixtures: [] }, { status: 404 });
  }
  try {
    const fixtures = await getCompetitionFixturesWindow(competition);
    const withEvents = await attachEvents(fixtures);
    return NextResponse.json({ fixtures: withEvents });
  } catch {
    return NextResponse.json({ fixtures: [] }, { status: 200 });
  }
}
