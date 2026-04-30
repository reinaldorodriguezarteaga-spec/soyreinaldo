import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron-driven ingest de resultados desde API-Football.
 *
 * Llamada esperada: cada 1 min durante el Mundial vía cron-job.org pegando a
 * `https://www.soyreinaldo.com/api/sports/ingest` con header
 * `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Flujo:
 *   1. Lista los partidos "ingestables" (live o recién terminados sin marcar).
 *   2. Una sola llamada a API-Football por todos los fixture IDs (`?ids=...`).
 *   3. Update por cada partido: score_home, score_away, status, live_minute,
 *      finished, last_polled_at.
 *   4. Cuando un partido pasa de no-finished a finished, lo marcamos para que
 *      el leaderboard refleje los nuevos puntos (recalcula on-the-fly).
 *
 * Idempotente: si los datos no han cambiado, los UPDATEs son no-ops a efectos
 * prácticos. Se puede ejecutar varias veces por minuto sin problemas.
 *
 * Conserva 1 sola llamada a API-Football por tick → con 7.500/día tenemos
 * margen sobrado para un 1-min-cron durante todo el Mundial.
 */

const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

type ApiFixture = {
  fixture: {
    id: number;
    status: { short: string; elapsed: number | null };
  };
  goals: { home: number | null; away: number | null };
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!supabaseUrl || !serviceRoleKey || !apiKey) {
    return NextResponse.json(
      {
        error: "Missing env vars",
        missing: [
          !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
          !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
          !apiKey && "API_FOOTBALL_KEY",
        ].filter(Boolean),
      },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Partidos candidatos a ingest
  const { data: pendingRows, error: rpcError } = await supabase.rpc(
    "matches_pending_ingest",
  );
  if (rpcError) {
    return NextResponse.json(
      { error: "RPC error", detail: rpcError.message },
      { status: 500 },
    );
  }

  const pending = (pendingRows ?? []) as Array<{
    id: number;
    api_football_fixture_id: number;
  }>;

  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      polled: 0,
      updated: 0,
      finished: 0,
      note: "No matches in ingest window",
    });
  }

  // 2. Una llamada a API-Football con todos los fixture IDs
  const ids = pending.map((p) => p.api_football_fixture_id).join("-");
  const apiUrl = `https://v3.football.api-sports.io/fixtures?ids=${ids}`;
  const apiRes = await fetch(apiUrl, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  if (!apiRes.ok) {
    return NextResponse.json(
      { error: `API-Football ${apiRes.status}` },
      { status: 502 },
    );
  }
  const apiJson = (await apiRes.json()) as { response: ApiFixture[] };
  const byFixtureId = new Map<number, ApiFixture>();
  for (const f of apiJson.response) byFixtureId.set(f.fixture.id, f);

  // 3. Update por partido
  const nowIso = new Date().toISOString();
  let updated = 0;
  let newlyFinished = 0;
  const errors: string[] = [];

  for (const p of pending) {
    const fx = byFixtureId.get(p.api_football_fixture_id);
    if (!fx) continue;

    const status = fx.fixture.status.short;
    const isFinal = FINAL_STATUSES.has(status);
    const isLive = LIVE_STATUSES.has(status);
    const minute = isLive ? fx.fixture.status.elapsed ?? null : null;
    const scoreHome = fx.goals.home;
    const scoreAway = fx.goals.away;

    const update: Record<string, unknown> = {
      status,
      live_minute: minute,
      last_polled_at: nowIso,
    };
    if (scoreHome != null) update.score_home = scoreHome;
    if (scoreAway != null) update.score_away = scoreAway;
    if (isFinal) update.finished = true;

    const { error: upError } = await supabase
      .from("matches")
      .update(update)
      .eq("id", p.id);

    if (upError) {
      errors.push(`match ${p.id}: ${upError.message}`);
      continue;
    }
    updated += 1;
    if (isFinal) newlyFinished += 1;
  }

  return NextResponse.json({
    ok: true,
    polled: pending.length,
    updated,
    finished: newlyFinished,
    errors: errors.length > 0 ? errors : undefined,
  });
}
