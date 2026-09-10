import { NextResponse } from "next/server";
import {
  getCompetitionStandings,
  getCompetitionFixturesWindow,
  type Fixture,
  type StandingRow,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

export const runtime = "nodejs";

export type StandingsResponse = { standings: StandingRow[]; live: Fixture[] };

/**
 * Clasificación de una competición de tabla plana, con los partidos en
 * juego ahora mismo para que el cliente pueda fusionar el marcador
 * parcial (ver `mergeLiveStandingsFlat`) — el API de clasificación oficial
 * solo se actualiza al terminar cada partido.
 *   GET /api/sports/standings?competition=laliga
 *
 * Usado por la pestaña "Clasificación" del detalle de partido (bajo demanda,
 * igual que Previa/Cara a cara — solo se pide al abrir esa pestaña). La
 * ficha de equipo no la necesita: pide tabla + ventana de partidos en el
 * propio servidor junto con el resto de la página. Reutiliza el caché de
 * `getCompetitionStandings`/`getCompetitionFixturesWindow` (precalculado
 * por el cron / compartido con el widget de portada), así que no añade
 * coste de cuota.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("competition") ?? "";
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition || competition.standingsMode !== "table") {
    return NextResponse.json({ standings: [], live: [] } satisfies StandingsResponse);
  }
  try {
    const [standingsR, live] = await Promise.all([
      getCompetitionStandings(competition),
      getCompetitionFixturesWindow(competition).catch(() => [] as Fixture[]),
    ]);
    const standings = (standingsR as StandingRow[] | null) ?? [];
    return NextResponse.json({ standings, live } satisfies StandingsResponse);
  } catch {
    return NextResponse.json({ standings: [], live: [] } satisfies StandingsResponse);
  }
}
