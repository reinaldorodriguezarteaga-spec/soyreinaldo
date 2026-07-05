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
import { loadEsMap, type FixtureEs } from "@/lib/sports/widget-data";

export const runtime = "nodejs";

/** Cambia los nombres EN de los equipos por los ES en el advice y el ganador. */
function localizePrediction(
  p: MatchPrediction | null,
  es: FixtureEs | null,
): MatchPrediction | null {
  if (!p || !es) return p;
  const swap = (t: string | null): string | null => {
    if (!t) return t;
    let out = t;
    if (p.teamsEn.home && es.home?.name) out = out.split(p.teamsEn.home).join(es.home.name);
    if (p.teamsEn.away && es.away?.name) out = out.split(p.teamsEn.away).join(es.away.name);
    return out;
  };
  return { ...p, advice: swap(p.advice), winnerName: swap(p.winnerName) };
}

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
    const [prediction, injuries, lineups, odds, esMap] = await Promise.all([
      getFixturePredictions(fixture),
      getFixtureInjuries(fixture),
      getFixtureLineups(fixture),
      inApp ? Promise.resolve(null) : getFixtureOdds(fixture),
      loadEsMap([fixture]),
    ]);
    return NextResponse.json({
      prediction: localizePrediction(prediction, esMap[fixture] ?? null),
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
