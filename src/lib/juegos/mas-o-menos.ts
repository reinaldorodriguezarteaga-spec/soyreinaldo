import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { getCompetitionTopAssists, getCompetitionTopScorers, type PlayerStatLeader } from "@/lib/sports/api-football";
import { nombreCorto } from "@/lib/sports/nombres";

/**
 * «¿Más o menos?» (21-oct): dos jugadores de las grandes ligas y una
 * estadística de esta temporada (goles o asistencias); ¿quién tiene más? Los datos salen de los
 * rankings de goleadores y asistentes que ya cachean las páginas de liga
 * (8 consultas cacheadas, ninguna nueva para la cuota).
 */

export type Estadistica = "goles" | "asistencias";
export type JugadorMm = {
  id: number;
  nombre: string;
  foto: string;
  equipo: string;
  escudo: string;
  liga: string;
  goles: number;
  asistencias: number;
  partidos: number;
};

export const ESTADISTICAS: Record<Estadistica, string> = {
  goles: "goles",
  asistencias: "asistencias",
};

const LIGAS = ["laliga", "premier", "serie-a", "ligue-1"];

export async function jugadoresMasOMenos(): Promise<JugadorMm[]> {
  const porId = new Map<number, JugadorMm>();
  const meter = (p: PlayerStatLeader, liga: string) => {
    const s = p.statistics[0];
    if (!s || porId.has(p.player.id)) return;
    porId.set(p.player.id, {
      id: p.player.id,
      nombre: nombreCorto(p.player.name),
      foto: p.player.photo,
      equipo: s.team.name,
      escudo: s.team.logo,
      liga,
      goles: s.goals.total ?? 0,
      asistencias: s.goals.assists ?? 0,
      partidos: s.games.appearences ?? 0,
    });
  };
  await Promise.all(
    LIGAS.map(async (slug) => {
      const c = COMPETITIONS_BY_SLUG[slug];
      if (!c) return;
      const [g, a] = await Promise.all([
        // Los 12 primeros: más abajo salen nombres que no conoce nadie.
        getCompetitionTopScorers(c, 12).catch(() => []),
        getCompetitionTopAssists(c, 12).catch(() => []),
      ]);
      for (const p of [...g, ...a]) meter(p, c.name);
    }),
  );
  return [...porId.values()];
}

/** Siguiente pareja: estadística al azar y dos jugadores que no empaten en ella. */
export function siguientePareja(
  jugadores: JugadorMm[],
  azar: () => number,
): { a: JugadorMm; b: JugadorMm; stat: Estadistica } | null {
  const stats = Object.keys(ESTADISTICAS) as Estadistica[];
  for (let i = 0; i < 200; i++) {
    const stat = stats[Math.floor(azar() * stats.length)];
    const a = jugadores[Math.floor(azar() * jugadores.length)];
    const b = jugadores[Math.floor(azar() * jugadores.length)];
    if (a && b && a.id !== b.id && a[stat] !== b[stat]) return { a, b, stat };
  }
  return null;
}
