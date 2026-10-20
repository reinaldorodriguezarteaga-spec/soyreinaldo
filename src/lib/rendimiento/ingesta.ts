import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCompetitionAllFixtures,
  getFixtureById,
  getFixtureLineups,
  getFixturePlayersTodos,
  getFixtureSubEvents,
  isFinal,
} from "@/lib/sports/api-football";
import { COMPETITIONS, COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { conSuplentes, rolesDeAlineacion } from "./posiciones";

/**
 * Ingesta del rendimiento por posición (ver posiciones.ts). Usa las mismas
 * llamadas que la ficha del partido: con el partido terminado, salen del
 * archivo sin gastar cuota; solo los que no estén archivados cuestan.
 */

/** Competiciones que se completan aunque nadie haya abierto sus partidos. */
const COMPLETAR = ["laliga", "premier", "serie-a", "ligue-1", "champions", "europa", "conference"];
const HORAS_CIERRE = 6;

type Meta = { leagueId: number | null; season: number | null; fecha: string | null };

/** Competiciones de año natural (la temporada es el año del partido). */
const AÑO_NATURAL = new Set(["mls", "liga-argentina", "libertadores", "us-open-cup", "leagues-cup", "concacaf-champions-cup", "campeones-cup"]);

/** Temporada de un partido por su fecha: las europeas empiezan en julio
 * (oct-2026 → 2026, mar-2027 → 2026); las de año natural, el año. */
function temporadaDe(leagueId: number, fecha: string): number {
  const d = new Date(fecha);
  const comp = COMPETITIONS.find((c) => c.leagueId === leagueId);
  if (comp && AÑO_NATURAL.has(comp.slug)) return d.getUTCFullYear();
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

/** Procesa un partido terminado: guarda sus apariciones y lo marca. */
export async function procesarPartido(db: SupabaseClient, id: number, meta?: Meta): Promise<number> {
  const [alineaciones, jugadores, cambios, info] = await Promise.all([
    getFixtureLineups(id).catch(() => []),
    getFixturePlayersTodos(id).catch(() => []),
    getFixtureSubEvents(id).catch(() => []),
    meta ? Promise.resolve(null) : getFixtureById(id).catch(() => null),
  ]);
  const m: Meta = meta ?? {
    leagueId: info?.league.id ?? null,
    season: info ? temporadaDe(info.league.id, info.fixture.date) : null,
    fecha: info?.fixture.date ?? null,
  };

  const filas = [];
  for (const al of alineaciones) {
    const roles = conSuplentes(
      rolesDeAlineacion(al.formation, al.startXI),
      cambios
        .filter((c) => c.teamId === al.teamId)
        .map((c) => ({ teamId: c.teamId, sale: c.outId, entra: c.inId, minuto: c.minute })),
    );
    const delEquipo = jugadores.find((t) => t.team.id === al.teamId)?.players ?? [];
    for (const p of delEquipo) {
      const rol = roles.get(p.id);
      if (!rol || !p.minutes) continue;
      filas.push({
        fixture_id: id,
        player_id: p.id,
        team_id: al.teamId,
        league_id: m.leagueId,
        season: m.season,
        fecha: m.fecha,
        rol,
        minutos: p.minutes,
        goles: p.goals,
        asistencias: p.assists,
        nota: p.rating,
      });
    }
  }
  // Un jugador una vez por partido (el API a veces lo repite): si no, el
  // upsert del lote falla entero.
  const unicas = [...new Map(filas.map((f) => [f.player_id, f])).values()];
  if (unicas.length) {
    const { error } = await db.from("apariciones_posicion").upsert(unicas, { onConflict: "fixture_id,player_id" });
    if (error) throw new Error(`partido ${id}: ${error.message}`);
  }
  // Sin alineación con casillas no hay nada que sacar: también se marca, para
  // no volver a mirarlo cada hora.
  await db.from("rendimiento_procesados").upsert({ fixture_id: id, apariciones: unicas.length });
  return unicas.length;
}

/** Una pasada: primero lo ya archivado (gratis y rápido: ~0,35 s por
 * partido) y luego, hasta `completar`, partidos de esta temporada de las
 * competiciones principales que falten (esos pueden costar 3-4 llamadas). */
export async function pasada(
  db: SupabaseClient,
  { archivados = 60, completar = 10 }: { archivados?: number; completar?: number } = {},
): Promise<{ archivados: number; completados: number; filas: number }> {
  let filas = 0;
  const { data: pendientes } = await db.rpc("rendimiento_pendientes", { p_limite: archivados });
  const ids = ((pendientes ?? []) as { fixture_id: number }[]).map((x) => x.fixture_id);
  for (const id of ids) filas += await procesarPartido(db, id);

  let completados = 0;
  let hueco = completar;
  if (hueco > 0) {
    const limiteFecha = Date.now() - HORAS_CIERRE * 3_600_000;
    for (const slug of COMPLETAR) {
      if (hueco <= 0) break;
      const comp = COMPETITIONS_BY_SLUG[slug];
      if (!comp) continue;
      const terminados = (await getCompetitionAllFixtures(comp).catch(() => []))
        .filter((f) => isFinal(f) && Date.parse(f.fixture.date) < limiteFecha);
      if (!terminados.length) continue;
      const { data: hechos } = await db
        .from("rendimiento_procesados")
        .select("fixture_id")
        .in(
          "fixture_id",
          terminados.map((f) => f.fixture.id),
        );
      const ya = new Set(((hechos ?? []) as { fixture_id: number }[]).map((x) => x.fixture_id));
      for (const f of terminados.filter((x) => !ya.has(x.fixture.id)).slice(0, hueco)) {
        filas += await procesarPartido(db, f.fixture.id, {
          leagueId: f.league.id,
          season: temporadaDe(f.league.id, f.fixture.date),
          fecha: f.fixture.date,
        });
        completados++;
        hueco--;
      }
    }
  }
  return { archivados: ids.length, completados, filas };
}
