import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { notificarEquipo } from "@/lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron-driven ingest de resultados desde API-Football.
 *
 * Quién la llama: el job de pg_cron `ingesta-marcadores`, cada minuto, DENTRO
 * de Supabase (migración 038). Pega a `https://www.soyreinaldo.com/api/sports/ingest`
 * con `Authorization: Bearer <ingest_cron_secret del Vault>`. No hay ningún
 * cron externo — esto llegó a decir "cron-job.org" y costó una tarde: para
 * saber quién dispara qué, `select * from cron.job`.
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
  score?: {
    penalty?: { home: number | null; away: number | null };
  };
};

/** Fixture de la lista del Mundial, con lo mínimo para casar por hora/equipo. */
type WcListFixture = {
  fixture: { id: number; date: string };
  teams: { home: { name: string }; away: { name: string } };
};

function nameKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Códigos FIFA (los ids de `teams`) → nombre canónico de API-Football. */
const TEAM_FIFA_TO_API_NAME: Record<string, string> = {
  ALG: "Algeria", AUT: "Austria", BEL: "Belgium", BIH: "Bosnia & Herzegovina",
  BRA: "Brazil", CAN: "Canada", CIV: "Ivory Coast", COD: "Congo DR",
  CPV: "Cape Verde Islands", CRO: "Croatia", CUW: "Curaçao",
  CZE: "Czech Republic", EGY: "Egypt", ENG: "England", ESP: "Spain",
  FRA: "France", GER: "Germany", HAI: "Haiti", IRN: "Iran", IRQ: "Iraq",
  JOR: "Jordan", JPN: "Japan", KOR: "South Korea", KSA: "Saudi Arabia",
  MAR: "Morocco", MEX: "Mexico", NED: "Netherlands", NOR: "Norway",
  NZL: "New Zealand", PAN: "Panama", POR: "Portugal", QAT: "Qatar",
  RSA: "South Africa", SCO: "Scotland", SUI: "Switzerland", SWE: "Sweden",
  TUN: "Tunisia", TUR: "Türkiye", USA: "USA", UZB: "Uzbekistan",
};

/** Elige la fixtura de API que corresponde a un partido nuestro (por hora, y
 *  desempatando por el nombre del equipo local). Misma estrategia que
 *  scripts/backfill-fixture-ids.mjs. */
function pickFixtureFor(
  m: { kickoff_at: string; team_home: string | null; home_name: string | null },
  fixtures: WcListFixture[],
): WcListFixture | null {
  const ourTs = new Date(m.kickoff_at).getTime();
  const wantedName =
    (m.team_home ? TEAM_FIFA_TO_API_NAME[m.team_home] : null) ??
    m.home_name ??
    "";
  const wantedKey = nameKey(wantedName);

  let candidates = fixtures.filter(
    (f) => Math.abs(new Date(f.fixture.date).getTime() - ourTs) <= 5 * 60 * 1000,
  );
  if (candidates.length === 0 && wantedKey) {
    candidates = fixtures.filter(
      (f) =>
        Math.abs(new Date(f.fixture.date).getTime() - ourTs) <=
          3 * 60 * 60 * 1000 && nameKey(f.teams.home.name) === wantedKey,
    );
  }
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    return (
      candidates.find((c) => nameKey(c.teams.home.name) === wantedKey) ??
      candidates.find((c) =>
        nameKey(c.teams.home.name).startsWith(wantedKey.slice(0, 4)),
      ) ??
      null
    );
  }
  return null;
}

/**
 * Auto-reparación: rellena `api_football_fixture_id` en partidos que ya tienen
 * equipos asignados (p. ej. al resolverse el bracket) pero perdieron su id.
 * Solo actúa sobre partidos cercanos (ventana ~[-6h, +26h]) sin terminar y sin
 * id, y solo hace la llamada extra a API-Football cuando hay alguno — así no
 * gasta quota en ticks normales. Devuelve cuántos rellenó.
 */
async function backfillMissingFixtureIds(
  supabase: SupabaseClient,
  apiKey: string,
): Promise<number> {
  const now = Date.now();
  const fromIso = new Date(now - 6 * 60 * 60 * 1000).toISOString();
  const toIso = new Date(now + 26 * 60 * 60 * 1000).toISOString();

  const { data: missing } = await supabase
    .from("matches")
    .select("id, kickoff_at, team_home, home:team_home(name)")
    .is("api_football_fixture_id", null)
    .eq("finished", false)
    .not("team_home", "is", null)
    .not("team_away", "is", null)
    .gte("kickoff_at", fromIso)
    .lte("kickoff_at", toIso)
    .returns<
      {
        id: number;
        kickoff_at: string;
        team_home: string | null;
        home: { name: string } | null;
      }[]
    >();

  if (!missing || missing.length === 0) return 0;

  const res = await fetch(
    "https://v3.football.api-sports.io/fixtures?league=1&season=2026",
    { headers: { "x-apisports-key": apiKey }, cache: "no-store" },
  );
  const remaining =
    res.headers.get("x-ratelimit-requests-remaining") ??
    res.headers.get("X-RateLimit-Remaining") ??
    "?";
  console.log(
    `[apif] BACKFILL /fixtures?league=1&season=2026 missing=${missing.length} status=${res.status} remaining=${remaining}`,
  );
  if (!res.ok) return 0;
  const { response: fixtures } = (await res.json()) as {
    response: WcListFixture[];
  };
  if (!Array.isArray(fixtures) || fixtures.length === 0) return 0;

  let filled = 0;
  for (const m of missing) {
    const pick = pickFixtureFor(
      { kickoff_at: m.kickoff_at, team_home: m.team_home, home_name: m.home?.name ?? null },
      fixtures,
    );
    if (!pick) continue;
    const { error } = await supabase
      .from("matches")
      .update({ api_football_fixture_id: pick.fixture.id })
      .eq("id", m.id)
      .is("api_football_fixture_id", null);
    if (!error) filled += 1;
  }
  return filled;
}

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

  // 0. Auto-reparación: rellena fixture ids que falten (p. ej. al resolverse el
  //    bracket) para que la ingesta pueda pedir su marcador. Best-effort: si
  //    falla, no bloquea la ingesta normal.
  let backfilled = 0;
  try {
    backfilled = await backfillMissingFixtureIds(supabase, apiKey);
  } catch {
    // no-op: el backfill es best-effort
  }

  // 0.5 QUINIELA DE CLUBES (lq_matches): ingesta en vivo. El id de lq_matches
  //     ES el fixture id de API-Football (se sembró así) → sin backfill ni casar
  //     por hora, se piden directos por id. Best-effort e independiente del
  //     Mundial (que abajo ya casi siempre está vacío: terminó).
  let lqPolled = 0;
  let lqUpdated = 0;
  let lqFinished = 0;
  try {
    const { data: lqPending } = await supabase.rpc("lq_matches_pending_ingest");
    const lqIds = ((lqPending ?? []) as Array<{ id: number }>).map((r) => r.id);
    if (lqIds.length > 0) {
      lqPolled = lqIds.length;
      // Marcador ANTES de actualizarlo: comparándolo sabemos si ha habido gol.
      // Sin esto solo tendríamos el resultado nuevo, que no dice si acaba de
      // cambiar. De aquí salen los avisos.
      const { data: previas } = await supabase
        .from("lq_matches")
        .select(
          `id, score_home, score_away, team_home, team_away,
           home:team_home(name), away:team_away(name)`,
        )
        .in("id", lqIds);
      type Previa = {
        id: number;
        score_home: number | null;
        score_away: number | null;
        team_home: number;
        team_away: number;
        home: { name: string } | null;
        away: { name: string } | null;
      };
      const antes = new Map(
        ((previas ?? []) as unknown as Previa[]).map((m) => [m.id, m]),
      );
      const lqNow = new Date().toISOString();
      const lqRes = await fetch(
        `https://v3.football.api-sports.io/fixtures?ids=${lqIds.join("-")}`,
        { headers: { "x-apisports-key": apiKey }, cache: "no-store" },
      );
      const rem =
        lqRes.headers.get("x-ratelimit-requests-remaining") ??
        lqRes.headers.get("X-RateLimit-Remaining") ??
        "?";
      console.log(
        `[apif] LQ /fixtures?ids n=${lqIds.length} status=${lqRes.status} remaining=${rem}`,
      );
      if (lqRes.ok) {
        const lqJson = (await lqRes.json()) as { response: ApiFixture[] };
        for (const fx of lqJson.response) {
          const st = fx.fixture.status.short;
          const isFinal = FINAL_STATUSES.has(st);
          const isLive = LIVE_STATUSES.has(st);
          const upd: Record<string, unknown> = {
            status: st,
            live_minute: isLive ? fx.fixture.status.elapsed ?? null : null,
            last_polled_at: lqNow,
          };
          if (fx.goals.home != null) upd.score_home = fx.goals.home;
          if (fx.goals.away != null) upd.score_away = fx.goals.away;
          if (isFinal) upd.finished = true;
          const { error: e } = await supabase
            .from("lq_matches")
            .update(upd)
            .eq("id", fx.fixture.id);
          if (!e) {
            lqUpdated += 1;
            if (isFinal) lqFinished += 1;

            // ¿Gol? Avisamos a quien tenga a alguno de los dos en favoritos.
            // Best-effort: si el envío falla, la ingesta sigue.
            const prev = antes.get(fx.fixture.id);
            if (prev && fx.goals.home != null && fx.goals.away != null) {
              const localMarco = fx.goals.home > (prev.score_home ?? 0);
              const visitanteMarco = fx.goals.away > (prev.score_away ?? 0);
              if (localMarco || visitanteMarco) {
                const nLocal = prev.home?.name ?? "Local";
                const nVisitante = prev.away?.name ?? "Visitante";
                const quienMarco = localMarco ? nLocal : nVisitante;
                const equipoQueMarco = localMarco ? prev.team_home : prev.team_away;
                const minuto = fx.fixture.status.elapsed;
                const payload = {
                  title: `⚽ Gol del ${quienMarco}`,
                  body:
                    `${nLocal} ${fx.goals.home}–${fx.goals.away} ${nVisitante}` +
                    (minuto != null ? ` · min ${minuto}` : ""),
                  url: `/liga/laliga/partido/${fx.fixture.id}`,
                  // Mismo partido = el aviso se sustituye, no se apila.
                  tag: `gol-${fx.fixture.id}`,
                };
                try {
                  // A los dos bandos: al que marcó y al que encajó.
                  await notificarEquipo(equipoQueMarco, payload);
                  await notificarEquipo(
                    localMarco ? prev.team_away : prev.team_home,
                    payload,
                  );
                } catch {
                  // no rompe la ingesta
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // best-effort: no rompe la ingesta del Mundial
  }

  // 1. Partidos candidatos a ingest (ya con los ids recién rellenados)
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
      backfilled,
      lq: { polled: lqPolled, updated: lqUpdated, finished: lqFinished },
      note: "No Mundial matches in ingest window",
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
    const penHome = fx.score?.penalty?.home ?? null;
    const penAway = fx.score?.penalty?.away ?? null;

    const update: Record<string, unknown> = {
      status,
      live_minute: minute,
      last_polled_at: nowIso,
    };
    if (scoreHome != null) update.score_home = scoreHome;
    if (scoreAway != null) update.score_away = scoreAway;
    // Tanda de penaltis (KO empatados): el trigger propagate_ko_result la usa
    // como desempate para propagar el ganador al cruce siguiente.
    if (penHome != null) update.penalty_home = penHome;
    if (penAway != null) update.penalty_away = penAway;
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
    backfilled,
    lq: { polled: lqPolled, updated: lqUpdated, finished: lqFinished },
    errors: errors.length > 0 ? errors : undefined,
  });
}
