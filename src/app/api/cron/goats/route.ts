import { NextResponse } from "next/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import {
  getFixturePlayers,
  getTeamFixtures,
  getTemporadaJugador,
  isFinal,
} from "@/lib/sports/api-football";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Messi vs Ronaldo (migración 064). Cada 2 h mira los últimos partidos de
 * sus equipos (club y selección) y, por cada partido terminado desde la
 * fecha de corte que aún no esté apuntado, lee sus estadísticas en ese
 * partido (/fixtures/players) y las guarda en `goat_partidos`. Si no jugó,
 * se apunta con 0 minutos para no volver a mirarlo. Solo partidos acabados
 * hace más de 2 h 30 desde el inicio (estadísticas ya cerradas).
 * ~4-8 llamadas cada 2 h, casi siempre servidas de caché.
 */
const GOATS = [
  { jugador: "messi", apiId: 154, season: 2026, equipos: [9568, 26] }, // Inter Miami, Argentina
  { jugador: "ronaldo", apiId: 874, season: 2026, equipos: [2939, 27] }, // Al-Nassr, Portugal
];

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });

  const { data: bases } = await db
    .from("goat_base")
    .select("jugador, desde")
    .returns<{ jugador: string; desde: string }[]>();
  const desde = new Map((bases ?? []).map((b) => [b.jugador, Date.parse(`${b.desde}T00:00:00Z`)]));
  const { data: hechos } = await db
    .from("goat_partidos")
    .select("fixture_id, jugador")
    .returns<{ fixture_id: number; jugador: string }[]>();
  const yaEsta = new Set((hechos ?? []).map((h) => `${h.jugador}:${h.fixture_id}`));

  const nuevos: { jugador: string; partido: string; minutos: number; goles: number; asistencias: number }[] = [];
  for (const g of GOATS) {
    const corte = desde.get(g.jugador);
    if (corte == null) continue;
    for (const equipo of g.equipos) {
      const { recent } = await getTeamFixtures(equipo, { last: 5, next: 3, revalidate: 3600 });
      for (const f of recent) {
        const inicio = Date.parse(f.fixture.date);
        if (!isFinal(f) || inicio < corte || Date.now() - inicio < 150 * 60_000) continue;
        if (yaEsta.has(`${g.jugador}:${f.fixture.id}`)) continue;
        const equipos = await getFixturePlayers(f.fixture.id, 3600);
        const p = equipos.flatMap((t) => t.players).find((x) => x.id === g.apiId);
        const minutos = p?.minutes ?? 0;
        const fila = {
          fixture_id: f.fixture.id,
          jugador: g.jugador,
          fecha: f.fixture.date,
          minutos,
          goles: minutos > 0 ? (p?.goals ?? 0) : 0,
          asistencias: minutos > 0 ? (p?.assists ?? 0) : 0,
          pen_marcados: minutos > 0 ? (p?.stats.penScored ?? 0) : 0,
          pen_fallados: minutos > 0 ? (p?.stats.penMissed ?? 0) : 0,
        };
        // Sin estadísticas todavía (lista vacía): se reintenta en la siguiente vuelta.
        if (equipos.length === 0) continue;
        const { error } = await db.from("goat_partidos").insert(fila);
        if (!error) {
          yaEsta.add(`${g.jugador}:${f.fixture.id}`);
          nuevos.push({
            jugador: g.jugador,
            partido: `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`,
            minutos,
            goles: fila.goles,
            asistencias: fila.asistencias,
          });
        }
      }
    }
  }
  // Tras un partido nuevo, su temporada al día en la página /messi-vs-ronaldo.
  for (const g of GOATS) {
    if (nuevos.some((n) => n.jugador === g.jugador)) await getTemporadaJugador(g.apiId, g.season, true);
  }
  return NextResponse.json({ ok: true, nuevos });
}
