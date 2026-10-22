/**
 * Niveles y puntos de los juegos (22-oct, pedido del dueño): antes de empezar
 * se elige nivel; cada uno da menos tiempo y multiplica más los puntos. Los
 * puntos del reto del día van al ranking de /juegos/ranking.
 */

export type Nivel = "facil" | "medio" | "dificil";
export type JuegoRanking = "equipo" | "jugador" | "tikitaka" | "leyenda" | "masomenos";

export const NIVELES: Record<Nivel, { nombre: string; segundos: number; mult: number }> = {
  facil: { nombre: "Fácil", segundos: 120, mult: 1 },
  medio: { nombre: "Medio", segundos: 90, mult: 1.5 },
  dificil: { nombre: "Difícil", segundos: 60, mult: 2 },
};

export const NOMBRE_JUEGO: Record<JuegoRanking, string> = {
  equipo: "Adivina el equipo",
  jugador: "Adivina el jugador",
  tikitaka: "Tiki-taka-toe",
  leyenda: "Once de leyenda",
  masomenos: "¿Más o menos?",
};

/** Tope de puntos por partida (el servidor no acepta más: evita trampas burdas). */
export const MAX_PUNTOS: Record<JuegoRanking, number> = {
  equipo: 500,
  jugador: 500,
  tikitaka: 500,
  leyenda: 500,
  masomenos: 1000,
};

/** Adivina el equipo / el jugador: 100 por acertar, −15 por cada fallo, +1
 * por segundo que sobre; todo por el multiplicador del nivel. Sin acertar, 0. */
export function puntosAdivinar(o: { acertado: boolean; fallos: number; sobra: number; nivel: Nivel }): number {
  if (!o.acertado) return 0;
  return Math.round((100 - 15 * o.fallos + Math.max(0, o.sobra)) * NIVELES[o.nivel].mult);
}

/** Tiki-taka-toe: 15 por casilla, +40 por tablero completo, +1 por segundo que sobre si se completa. */
export function puntosTikitaka(o: { aciertos: number; sobra: number; nivel: Nivel }): number {
  const base = o.aciertos * 15 + (o.aciertos === 9 ? 40 + Math.max(0, o.sobra) : 0);
  return Math.round(base * NIVELES[o.nivel].mult);
}

/** Once de leyenda: 12 por elegir al mejor de la terna, +1 por segundo que sobre al acabar. */
export function puntosLeyenda(o: { mejores: number; sobra: number; nivel: Nivel; terminado: boolean }): number {
  return Math.round((o.mejores * 12 + (o.terminado ? Math.max(0, o.sobra) : 0)) * NIVELES[o.nivel].mult);
}

/** ¿Más o menos? contrarreloj: 10 por acierto. */
export function puntosMasOMenos(o: { racha: number; nivel: Nivel }): number {
  return Math.round(o.racha * 10 * NIVELES[o.nivel].mult);
}

/** «1:05» */
export const reloj = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
