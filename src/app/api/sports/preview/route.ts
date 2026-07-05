import { NextResponse } from "next/server";
import {
  getFixturePredictions,
  getFixtureInjuries,
  getFixtureLineups,
  getFixtureOdds,
  type MatchPrediction,
  type Injury,
  type LineupTeam,
  type MatchOdds,
} from "@/lib/sports/api-football";
import { isAppRequest } from "@/lib/is-app";

export const runtime = "nodejs";

/**
 * Previa del partido servida BAJO DEMANDA (al abrir la pestaña "Previa"), para
 * no gastar llamadas en cada visita al detalle. Junta predicción, bajas,
 * alineaciones y cuotas. Las llamadas a API-Football van cacheadas
 * (unstable_cache), así que un aluvión de aperturas no dispara la quota.
 *
 * ⚠️ Las CUOTAS se omiten dentro de la app nativa (isAppRequest) por la política
 * "no gambling" de App Store / Play Store.
 */
export type PreviewData = {
  prediction: MatchPrediction | null;
  injuries: Injury[];
  lineups: LineupTeam[];
  odds: MatchOdds | null;
};

export async function GET(req: Request) {
  const fixture = Number(new URL(req.url).searchParams.get("fixture"));
  if (!Number.isFinite(fixture)) {
    return NextResponse.json({ error: "bad fixture" }, { status: 400 });
  }

  const inApp = await isAppRequest();

  try {
    const [prediction, injuries, lineups, odds] = await Promise.all([
      getFixturePredictions(fixture),
      getFixtureInjuries(fixture),
      getFixtureLineups(fixture),
      inApp ? Promise.resolve(null) : getFixtureOdds(fixture),
    ]);
    return NextResponse.json({
      prediction,
      injuries,
      lineups,
      odds,
    } satisfies PreviewData);
  } catch {
    return NextResponse.json(
      {
        prediction: null,
        injuries: [],
        lineups: [],
        odds: null,
      } satisfies PreviewData,
      { status: 200 },
    );
  }
}
