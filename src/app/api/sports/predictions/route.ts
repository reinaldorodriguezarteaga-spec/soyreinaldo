import { NextResponse } from "next/server";
import { getFixturePredictions } from "@/lib/sports/api-football";
import { isAppRequest } from "@/lib/is-app";

export const runtime = "nodejs";

const MAX = 16;

/**
 * Probabilidades 1X2 de varios partidos de golpe, para las tarjetas de
 * "Próximos". Se pide BAJO DEMANDA al abrir esa pestaña. Cada predicción va
 * cacheada (unstable_cache), así que aunque se pidan 16 a la vez el coste real
 * es 1 llamada por partido cada 30 min, compartida entre todos.
 *
 * GET /api/sports/predictions?fixtures=1,2,3
 * → { "1": { home, draw, away }, ... }  (solo los que tienen predicción)
 *
 * Dentro de la app, nada: Apple las cuenta como información de apuestas
 * (rechazo de la 1.1, norma 2.3.6, 4-nov-2026).
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("fixtures") ?? "";
  const ids = raw
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, MAX);

  if (ids.length === 0 || (await isAppRequest())) return NextResponse.json({});

  const out: Record<number, { home: number; draw: number; away: number }> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const p = await getFixturePredictions(id);
        if (p) out[id] = p.percent;
      } catch {
        // un fallo puntual no debe tumbar el resto
      }
    }),
  );

  return NextResponse.json(out);
}
