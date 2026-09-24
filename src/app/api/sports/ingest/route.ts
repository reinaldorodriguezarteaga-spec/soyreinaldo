import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notificarEquipo } from "@/lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ingesta en vivo de la quiniela de clubes (`lq_matches`) desde API-Football.
 *
 * Quién la llama: el job de pg_cron `ingesta-marcadores`, cada minuto, DENTRO
 * de Supabase (migración 038), con `Authorization: Bearer <ingest_cron_secret
 * del Vault>`. Para saber quién dispara qué: `select * from cron.job`.
 *
 * Flujo: `lq_matches_pending_ingest()` da los partidos a refrescar (ver
 * migración 052), UNA llamada a API-Football con todos (`?ids=`), y update de
 * marcador/estado/minuto por partido. Si cambia el marcador, aviso push a
 * quien siga a alguno de los dos equipos. Sin partidos pendientes no gasta
 * cuota. Idempotente.
 *
 * Aquí vivía también la ingesta del Mundial 2026 (`matches`, con auto-relleno
 * de fixture ids): se quitó el 24-sep-2026, llevaba desde julio encontrando
 * cero partidos cada minuto.
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

  // El id de lq_matches ES el fixture id de API-Football (se sembró así) →
  // se piden directos por id, sin casar por hora.
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
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    lq: { polled: lqPolled, updated: lqUpdated, finished: lqFinished },
  });
}
