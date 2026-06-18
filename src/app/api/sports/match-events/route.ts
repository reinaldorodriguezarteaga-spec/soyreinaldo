import { NextResponse } from "next/server";
import { getFixtureCards, getFixtureGoals } from "@/lib/sports/api-football";

export const runtime = "nodejs";

/**
 * Goles y expulsiones de varios partidos a la vez:
 *   GET /api/sports/match-events?ids=1,2,3
 *   → { "1": { goals: [...], reds: [...] }, ... }
 *
 * Pensado para la pestaña Resultados: pide solo los partidos de la jornada que
 * se está viendo (bajo demanda) en vez de enriquecer los 100+ finalizados en
 * cada carga. Los eventos de un partido terminado no cambian → caché 1 día.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n))
    .slice(0, 30);

  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const [goals, cards] = await Promise.all([
          getFixtureGoals(id, 86400),
          getFixtureCards(id, 86400),
        ]);
        return [id, { goals, reds: cards.filter((c) => c.expulsion) }] as const;
      } catch {
        return [id, { goals: [], reds: [] }] as const;
      }
    }),
  );

  return NextResponse.json(Object.fromEntries(entries));
}
