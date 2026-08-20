import { NextResponse } from "next/server";
import {
  allFixturesCacheKey,
  getCompetitionAllFixtures,
  getCompetitionStandings,
  getCompetitionUpcomingFixtures,
  getCompetitionTeamRefs,
  getExtraLeagueUpcoming,
  getTeamFixtures,
  getTeamSquadLive,
  standingsCacheKey,
  teamFixturesLastCacheKey,
  teamFixturesNextCacheKey,
  teamSquadCacheKey,
  upcomingCacheKey,
  upcomingExtraCacheKey,
} from "@/lib/sports/api-football";
import {
  CALENDAR_EXTRA_LEAGUES,
  COMPETITIONS,
  FEATURED_TEAMS,
} from "@/lib/sports/competitions";
import { readCache, writeCache } from "@/lib/sports/sports-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 9 competiciones × 3 llamadas + 6 equipos destacados, secuenciado en lotes
// pequeños — de sobra en unos segundos, pero por si acaso.
export const maxDuration = 60;

/**
 * Cron externo (cron-job.org, cada 5-10 min — NO va en vercel.json: el plan
 * gratis de Vercel solo permite crons de una vez al día). Precalcula en
 * `sports_cache` (migración 033) la tabla, calendario y próximos partidos de
 * las 9 competiciones + 6 equipos destacados, para que la portada y
 * `/liga/[slug]` dejen de pegarle a la API en cada visita — el consumo de
 * cuota queda acotado por la frecuencia de este cron, no por el tráfico
 * (incidente 13-ago: un pico de visitantes/bot agotó la cuota diaria en
 * minutos porque cada visita repetía las mismas ~39 llamadas).
 *
 * A propósito NO cachea `getCompetitionFixturesWindow` (marcador en
 * vivo/hoy) — esa sigue en vivo con su propio TTL corto (45s), tiene que
 * reflejar goles al momento.
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`, igual que
 * /api/sports/ingest y /api/cron/reminders.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];
  let competitionsDone = 0;
  let teamsDone = 0;
  let squadsDone = 0;
  let extrasDone = 0;

  // Lotes pequeños (3 a la vez): rápido, sin ráfaga contra el límite por
  // minuto de la API.
  async function runBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += size) {
      await Promise.all(
        items.slice(i, i + size).map(async (item) => {
          try {
            await fn(item);
          } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
          }
        }),
      );
    }
  }

  await runBatches(COMPETITIONS, 3, async (c) => {
    const [standings, upcoming, all] = await Promise.all([
      getCompetitionStandings(c, { forceLive: true }),
      getCompetitionUpcomingFixtures(c, 12, { forceLive: true }),
      getCompetitionAllFixtures(c, { forceLive: true }),
    ]);
    await Promise.all([
      standings ? writeCache(standingsCacheKey(c), standings) : Promise.resolve(),
      writeCache(upcomingCacheKey(c), upcoming),
      writeCache(allFixturesCacheKey(c), all),
    ]);
    competitionsDone++;
  });

  await runBatches(FEATURED_TEAMS, 3, async (team) => {
    const { recent, upcoming } = await getTeamFixtures(team.id, {
      next: 4,
      forceLive: true,
    });
    await Promise.all([
      writeCache(teamFixturesLastCacheKey(team.id, 20), recent),
      writeCache(teamFixturesNextCacheKey(team.id, 4), upcoming),
    ]);
    teamsDone++;
  });

  // Ligas/copas extra del calendario (solo próximos partidos, 1 llamada c/u).
  await runBatches(CALENDAR_EXTRA_LEAGUES, 3, async (entry) => {
    // n=12 con filtro de equipos — ver nota en getUpcomingCalendar.
    const fixtures = await getExtraLeagueUpcoming(entry, entry.onlyTeamIds ? 12 : 6, {
      forceLive: true,
    });
    await writeCache(upcomingExtraCacheKey(entry.leagueId), fixtures);
    extrasDone++;
  });

  // PLANTILLAS. La ficha de equipo lanzaba esta llamada en la misma ráfaga que
  // otras cuatro y API-Football la rechazaba por su límite POR MINUTO, así que
  // la pestaña "Jugadores" aparecía y desaparecía según la visita. Ahora el
  // coste lo paga el cron, despacio y una sola vez, igual que el resto de la
  // caché.
  //
  // Solo se rellenan las que faltan o llevan más de 12h, y como mucho SQUAD_MAX
  // por vuelta: con el cron cada 10 min, una competición entera se completa en
  // dos vueltas y luego el coste en régimen es casi cero.
  const SQUAD_MAX = 12;
  const SQUAD_FRESCA_S = 60 * 60 * 12;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const c of COMPETITIONS) {
    if (squadsDone >= SQUAD_MAX) break;
    if (c.standingsMode === "none") continue;
    try {
      const refs = await getCompetitionTeamRefs(c);
      for (const t of refs) {
        if (squadsDone >= SQUAD_MAX) break;
        const fresca = await readCache<unknown[]>(
          teamSquadCacheKey(t.id),
          SQUAD_FRESCA_S,
        );
        if (fresca && fresca.length > 0) continue;
        const sq = await getTeamSquadLive(t.id);
        if (sq.length > 0) {
          await writeCache(teamSquadCacheKey(t.id), sq);
          squadsDone++;
        }
        await sleep(250);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    competitionsDone,
    squadsDone,
    teamsDone,
    extrasDone,
    total:
      COMPETITIONS.length + FEATURED_TEAMS.length + CALENDAR_EXTRA_LEAGUES.length,
    errors: errors.slice(0, 10),
  });
}
