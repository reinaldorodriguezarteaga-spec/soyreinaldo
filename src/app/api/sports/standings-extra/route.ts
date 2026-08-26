import { NextResponse } from "next/server";
import {
  getCompetitionStandings,
  getTeamsExtras,
  type StandingRow,
  type TeamExtras,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

export const runtime = "nodejs";

/**
 * Extras de la tabla (tarjetas, porterías a cero, racha) de una competición.
 *   GET /api/sports/standings-extra?competition=laliga
 *
 * Se pide SOLO cuando alguien despliega la tabla completa, nunca al cargar la
 * página: cuesta una llamada por equipo y no se le va a cobrar a quien
 * entra solo a mirar la clasificación. La caché de 12 h vive en la librería.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("competition") ?? "";
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) {
    return NextResponse.json({} as Record<number, TeamExtras>, { status: 404 });
  }
  try {
    const filas = (await getCompetitionStandings(competition)) as StandingRow[] | null;
    const ids = (filas ?? [])
      .map((f) => f.team?.id)
      .filter((id): id is number => Number.isFinite(id));
    if (ids.length === 0) return NextResponse.json({});
    return NextResponse.json(await getTeamsExtras(competition, ids));
  } catch {
    return NextResponse.json({});
  }
}
