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
import { tiempoDisponible } from "@/lib/sports/presupuesto-directo";
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
  const limite = Date.now() + 11_000;
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  let parcial = false;
  let escritos = 0;
  let terminados: Partido[] = [];
  const senal = (maximo: number, reserva = 0) =>
    AbortSignal.timeout(tiempoDisponible(limite, maximo, reserva));

  // Calendarios ya guardados, en paralelo y sin llamadas a API-Football.
  const activas = (
    await Promise.all(COMPETITIONS.map(async (c) =>
      (await competicionConPartidoCerca(c, senal(3_000))) ? c : null,
    ))
  ).filter((c): c is (typeof COMPETITIONS)[number] => c !== null);

  async function cerrar(conLatido: boolean) {
    const tareas = [];
    if (conLatido && tiempoDisponible(limite, 3_000) > 0) {
      tareas.push(db.from("directo_latido")
        .upsert({ id: 1, latido: new Date().toISOString() }).abortSignal(senal(3_000)));
    } else if (conLatido) parcial = true;
    // La limpieza es opcional y nunca retrasa la lectura en vivo.
    if (tiempoDisponible(limite, 3_000) >= 1_500) {
      tareas.push(db.from("partidos_directo").delete()
        .lt("actualizado", new Date(Date.now() - 6 * 3_600_000).toISOString())
        .abortSignal(senal(3_000)));
    } else parcial = true;
    const resultados = await Promise.allSettled(tareas);
    if (resultados.some((r) => r.status === "rejected" || r.value.error)) parcial = true;
  }

  if (activas.length === 0) {
    await cerrar(true);
    return NextResponse.json({ ok: true, activas: 0, parcial });
  }

  const ligas = new Set(activas.map((c) => c.leagueId));
  const [enJuego, anteriores] = await Promise.all([
    getPartidosEnJuego(senal(6_000, 2_000)),
    db.from("partidos_directo").select("fixture_id, firma, data").abortSignal(senal(3_000)),
  ]);
  if (enJuego === null || anteriores.error) {
    // No certificar datos antiguos como recientes si falla la lectura.
    await cerrar(false);
    return NextResponse.json({ ok: false, parcial: true, error: "No se pudo actualizar el directo" });
  }

  const nuestros = enJuego.filter((f) => ligas.has(f.league.id));
  const previa = new Map(
    ((anteriores.data ?? []) as { fixture_id: number; firma: string; data: Partido }[])
      .map((p) => [p.fixture_id, p]),
  );
  const vivosAhora = new Set(nuestros.map((f) => f.fixture.id));
  const desaparecidos = [...previa.values()]
    .filter((p) => !vivosAhora.has(p.fixture_id) && isLive(p.data))
    .map((p) => p.fixture_id);

  async function guardar(partidos: Partido[]) {
    const cambios = partidos.filter((f) => previa.get(f.fixture.id)?.firma !== firma(f))
      .map((f) => ({ fixture_id: f.fixture.id, league_id: f.league.id,
        data: f, firma: firma(f), actualizado: new Date().toISOString() }));
    if (!cambios.length) return true;
    if (tiempoDisponible(limite, 3_000, 750) <= 0) {
      parcial = true;
      return false;
    }
    const { error } = await db.from("partidos_directo").upsert(cambios).abortSignal(senal(3_000, 750));
    if (error) parcial = true;
    else escritos += cambios.length;
    return !error;
  }

  // Persistir lo actual mientras se busca el cierre: son independientes.
  const [guardado] = await Promise.all([
    guardar(nuestros),
    (async () => {
      if (!desaparecidos.length) return;
      if (tiempoDisponible(limite, 6_000, 3_750) <= 0) {
        parcial = true;
        return;
      }
      terminados = await getPartidosPorIdsEnVivo(desaparecidos, senal(6_000, 3_750));
      if (terminados.length < Math.min(desaparecidos.length, 20)) parcial = true;
      await guardar(terminados.filter((f) => isFinal(f) || !isLive(f)));
    })(),
  ]);
  await cerrar(guardado);

  return NextResponse.json({ ok: true, activas: activas.length,
    enJuego: nuestros.length, terminados: terminados.length, escritos, parcial });
}
