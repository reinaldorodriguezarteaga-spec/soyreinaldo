import { NextResponse } from "next/server";
import { getCompetitionStandings, type StandingRow } from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

export const runtime = "nodejs";

/**
 * Clasificación de una competición de tabla plana.
 *   GET /api/sports/standings?competition=laliga
 *
 * Usado por la pestaña "Clasificación" del detalle de partido (bajo demanda,
 * igual que Previa/Cara a cara — solo se pide al abrir esa pestaña). La
 * ficha de equipo no la necesita: pide la tabla en el propio servidor junto
 * con el resto de la página. Reutiliza el caché de `getCompetitionStandings`
 * (precalculado por el cron), así que no añade coste de cuota.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("competition") ?? "";
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition || competition.standingsMode !== "table") {
    return NextResponse.json([] as StandingRow[]);
  }
  try {
    const standings = (await getCompetitionStandings(competition)) as StandingRow[] | null;
    return NextResponse.json(standings ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
