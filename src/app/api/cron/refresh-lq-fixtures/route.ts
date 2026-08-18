import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Re-sincroniza la FECHA de los partidos de la quiniela de clubes.
 *
 * Por qué hace falta: cuando LaLiga aplaza un partido, API-Football le cambia
 * la fecha pero `lq_matches.kickoff_at` se queda con la vieja. Y la ventana de
 * la ingesta en vivo (`lq_matches_pending_ingest`, de −4h a +5min) se calcula
 * sobre NUESTRA fecha — así que el partido pasa desapercibido el día que se
 * juega de verdad y se queda sin marcador para siempre. Le pasó a
 * Celta-Osasuna de la jornada 1, movido del 16 al 27 de agosto.
 *
 * Una sola llamada a API-Football por competición (`/fixtures?league&season`,
 * 380 partidos de una vez), y solo toca las filas cuya fecha ha cambiado.
 * No toca marcadores: de eso ya se encarga la ingesta.
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`, igual que las otras
 * rutas de cron. Lo llama el job de pg_cron `fechas-lq` (migración 043).
 */

/** Competiciones de la quiniela de clubes: slug en BD → liga/temporada API. */
const COMPETITIONS = [{ competition: "laliga", leagueId: 140, season: 2026 }];

type ApiFixture = {
  fixture: { id: number; date: string };
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
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const moved: { id: number; from: string; to: string }[] = [];
  const errors: string[] = [];

  for (const c of COMPETITIONS) {
    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=${c.leagueId}&season=${c.season}`,
        { headers: { "x-apisports-key": apiKey }, cache: "no-store" },
      );
      const body = (await res.json()) as {
        response?: ApiFixture[];
        errors?: unknown;
      };
      const list = body.response ?? [];
      console.log(
        `[apif] fixtures?league=${c.leagueId} status=${res.status} fixtures=${list.length}`,
      );
      if (list.length === 0) {
        errors.push(`${c.competition}: la API no devolvió partidos`);
        continue;
      }

      // Solo los que aún no han terminado: reescribir la fecha de un partido
      // ya jugado no aporta nada y arriesga a pisar datos buenos.
      const { data: rows } = await supabase
        .from("lq_matches")
        .select("id, kickoff_at")
        .eq("competition", c.competition)
        .eq("season", c.season)
        .eq("finished", false)
        .returns<{ id: number; kickoff_at: string }[]>();

      const nuestros = new Map((rows ?? []).map((r) => [r.id, r.kickoff_at]));

      for (const f of list) {
        const actual = nuestros.get(f.fixture.id);
        if (!actual) continue;
        // Comparamos por instante, no por texto: los formatos difieren.
        if (new Date(actual).getTime() === new Date(f.fixture.date).getTime()) {
          continue;
        }
        const { error } = await supabase
          .from("lq_matches")
          .update({ kickoff_at: f.fixture.date })
          .eq("id", f.fixture.id);
        if (error) {
          errors.push(`${f.fixture.id}: ${error.message}`);
          continue;
        }
        moved.push({ id: f.fixture.id, from: actual, to: f.fixture.date });
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    moved: moved.length,
    changes: moved,
    errors,
  });
}
