import { puntosPronostico, type Baremo } from "./scoring";

/**
 * Cálculo de UNA jornada de la quiniela: puntos de cada jugador en ella y su
 * puesto en la clasificación antes y después. Lo usan el resumen de jornada
 * (cron `resumen-jornada`) y la tarjeta para compartir (/mi-jornada).
 *
 * El puesto sale de `lq_leaderboard()` (la fuente de verdad, con picks y
 * ajustes) y el "antes" es ese total menos lo ganado en la jornada: así el
 * "has subido 3 puestos" cuadra siempre con la clasificación real.
 */

export type PartidoJornada = { id: number; home: number; away: number };
export type PronosticoJornada = {
  userId: string;
  matchId: number;
  home: number;
  away: number;
};
export type PuntosJornada = { puntos: number; exactos: number; aciertos: number; jugados: number };

export function puntosDeLaJornada(
  partidos: PartidoJornada[],
  pronosticos: PronosticoJornada[],
  baremo: Baremo,
): Map<string, PuntosJornada> {
  const real = new Map(partidos.map((p) => [p.id, p]));
  const out = new Map<string, PuntosJornada>();
  for (const pr of pronosticos) {
    const r = real.get(pr.matchId);
    if (!r) continue;
    const pts = puntosPronostico(
      { home: pr.home, away: pr.away },
      { home: r.home, away: r.away },
      baremo,
    );
    const acc = out.get(pr.userId) ?? { puntos: 0, exactos: 0, aciertos: 0, jugados: 0 };
    acc.puntos += pts;
    acc.jugados += 1;
    if (pts === baremo.exacto) acc.exactos += 1;
    else if (pts > 0) acc.aciertos += 1;
    out.set(pr.userId, acc);
  }
  return out;
}

/** Puesto de cada jugador (empates comparten puesto: 1, 2, 2, 4). */
export function puestos(totales: { userId: string; total: number }[]): Map<string, number> {
  const orden = [...totales].sort((a, b) => b.total - a.total);
  const out = new Map<string, number>();
  orden.forEach((t, i) => {
    const anterior = orden[i - 1];
    out.set(t.userId, anterior && anterior.total === t.total ? out.get(anterior.userId)! : i + 1);
  });
  return out;
}

export type ResumenJugador = PuntosJornada & {
  userId: string;
  puestoAhora: number | null;
  puestoAntes: number | null;
  totalJugadores: number;
};

/** Junta puntos de la jornada + clasificación actual en un resumen por jugador. */
export function resumenPorJugador(
  jornada: Map<string, PuntosJornada>,
  clasificacion: { userId: string; total: number }[],
): Map<string, ResumenJugador> {
  const ahora = puestos(clasificacion);
  const antes = puestos(
    clasificacion.map((c) => ({ userId: c.userId, total: c.total - (jornada.get(c.userId)?.puntos ?? 0) })),
  );
  const out = new Map<string, ResumenJugador>();
  for (const [userId, pj] of jornada) {
    out.set(userId, {
      ...pj,
      userId,
      puestoAhora: ahora.get(userId) ?? null,
      puestoAntes: antes.get(userId) ?? null,
      totalJugadores: clasificacion.length,
    });
  }
  return out;
}
