import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  competicionConPartidoCerca,
  getPartidosEnJuego,
  getPartidosPorIdsEnVivo,
  isFinal,
  isLive,
  type Fixture,
  type FixtureEvent,
} from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Directo en tiempo real (pg_cron `directo`, cada 15 s, migración 061).
 *
 * Si alguna de nuestras competiciones tiene partido en juego o cerca (según
 * el calendario ya guardado, sin llamar), hace UNA llamada
 * `/fixtures?live=all` —todos los partidos en juego del mundo, con sus
 * eventos— y guarda en `partidos_directo` los de nuestras competiciones.
 * Solo escribe la fila si cambia algo visible (estado, minuto, goles,
 * eventos): cada escritura es un aviso de Realtime a los navegadores.
 *
 * Un partido que deja de salir en `live=all` ha terminado: se pide por id
 * (una llamada para todos) y se guarda su estado final. Las filas de más de
 * 6 h se borran. En cada vuelta deja el latido (`directo_latido`): la web
 * solo se fía de la tabla si el latido es reciente.
 *
 * Coste: 4 llamadas/min solo mientras hay partidos (~240/h), la vean 10 o
 * 10.000 personas.
 */

type Partido = Fixture & { events?: FixtureEvent[] };

function firma(f: Partido): string {
  const ev = f.events ?? [];
  const ultimo = ev[ev.length - 1];
  return [
    f.fixture.status.short,
    f.fixture.status.elapsed ?? "",
    f.goals.home ?? "",
    f.goals.away ?? "",
    ev.length,
    ultimo ? `${ultimo.type}:${ultimo.time.elapsed}:${ultimo.player?.id ?? ""}` : "",
  ].join("|");
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });

  // Limpieza: lo de hace más de 6 h ya no es "directo".
  await db
    .from("partidos_directo")
    .delete()
    .lt("actualizado", new Date(Date.now() - 6 * 3_600_000).toISOString());

  // ¿Hay algo que mirar? Sin partidos cerca, ni una llamada.
  const activas = (
    await Promise.all(COMPETITIONS.map(async (c) => ((await competicionConPartidoCerca(c)) ? c : null)))
  ).filter((c): c is (typeof COMPETITIONS)[number] => c !== null);
  if (activas.length === 0) {
    return NextResponse.json({ ok: true, activas: 0 });
  }
  const ligas = new Set(activas.map((c) => c.leagueId));

  const enJuego = await getPartidosEnJuego();
  if (enJuego === null) {
    // La API falló: sin latido, la web vuelve sola a su camino de siempre.
    return NextResponse.json({ ok: false, error: "live=all falló" });
  }
  const nuestros = enJuego.filter((f) => ligas.has(f.league.id));

  const { data: previas } = await db
    .from("partidos_directo")
    .select("fixture_id, firma, data");
  const previa = new Map(
    ((previas ?? []) as { fixture_id: number; firma: string; data: Partido }[]).map((p) => [
      p.fixture_id,
      p,
    ]),
  );

  // Los que estaban en juego y ya no salen: han terminado (o se suspendieron).
  const vivosAhora = new Set(nuestros.map((f) => f.fixture.id));
  const desaparecidos = [...previa.values()]
    .filter((p) => !vivosAhora.has(p.fixture_id) && isLive(p.data))
    .map((p) => p.fixture_id);
  const terminados = desaparecidos.length ? await getPartidosPorIdsEnVivo(desaparecidos) : [];

  const ahora = new Date().toISOString();
  const cambios = [...nuestros, ...terminados.filter((f) => isFinal(f) || !isLive(f))]
    .filter((f) => previa.get(f.fixture.id)?.firma !== firma(f))
    .map((f) => ({
      fixture_id: f.fixture.id,
      league_id: f.league.id,
      data: f,
      firma: firma(f),
      actualizado: ahora,
    }));
  if (cambios.length > 0) {
    await db.from("partidos_directo").upsert(cambios);
  }
  await db.from("directo_latido").upsert({ id: 1, latido: ahora });

  return NextResponse.json({
    ok: true,
    activas: activas.length,
    enJuego: nuestros.length,
    terminados: terminados.length,
    escritos: cambios.length,
  });
}
