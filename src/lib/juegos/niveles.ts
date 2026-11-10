/**
 * Niveles y puntos de los juegos (22-oct, pedido del dueño): antes de empezar
 * se elige nivel; cada uno da menos tiempo y multiplica más los puntos. Los
 * puntos del reto del día van al ranking de /juegos/ranking.
 */

export type Nivel = "facil" | "medio" | "dificil";
export type JuegoRanking = "equipo" | "jugador" | "tikitaka" | "leyenda" | "masomenos" | "top10" | "ahorcado" | "misterioso" | "escudo" | "foto" | "agrupa" | "cronologia";

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
  top10: "Top 10",
  ahorcado: "Ahorcado",
  misterioso: "Futbolista misterioso",
  escudo: "Escudo borroso",
  foto: "Foto oculta",
  agrupa: "Agrupa los cuatro",
  cronologia: "Cronología",
};

/** Tope de puntos por partida (el servidor no acepta más: evita trampas burdas). */
export const MAX_PUNTOS: Record<JuegoRanking, number> = {
  equipo: 500,
  jugador: 500,
  tikitaka: 500,
  leyenda: 500,
  masomenos: 1000,
  top10: 1000,
  ahorcado: 500,
  misterioso: 500,
  escudo: 500,
  foto: 500,
  agrupa: 500,
  cronologia: 500,
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

/** Top 10: tiempo de cada nivel. Diez nombres piden más reloj que un
 * acierto suelto: 3:00, 2:15 y 1:30. */
export const SEGUNDOS_TOP10: Record<Nivel, number> = { facil: 180, medio: 135, dificil: 90 };

/** Top 10: 10 por nombre, +40 si se sacan los diez y +1 por segundo que sobre
 * (solo si se sacan todos); todo por el multiplicador del nivel. */
export function puntosTop10(o: { aciertos: number; sobra: number; nivel: Nivel }): number {
  const base = o.aciertos * 10 + (o.aciertos === 10 ? 40 + Math.max(0, o.sobra) : 0);
  return Math.round(base * NIVELES[o.nivel].mult);
}

/** Juegos de varios intentos (misterioso, escudo, foto): 100 por acertar,
 * −10 por cada fallo y +1 por segundo que sobre; sin acertar, 0. Nunca
 * negativo (el ranking no lo admite). */
export function puntosIntentos(o: { acertado: boolean; fallos: number; sobra: number; nivel: Nivel }): number {
  if (!o.acertado) return 0;
  return Math.max(0, Math.round((100 - 10 * o.fallos + Math.max(0, o.sobra)) * NIVELES[o.nivel].mult));
}

/** Agrupa los cuatro: 25 por grupo, −5 por error, +1 por segundo que sobre
 * si se sacan los cuatro. */
export function puntosAgrupa(o: { grupos: number; errores: number; sobra: number; nivel: Nivel }): number {
  const base = o.grupos * 25 - o.errores * 5 + (o.grupos === 4 ? Math.max(0, o.sobra) : 0);
  return Math.max(0, Math.round(base * NIVELES[o.nivel].mult));
}

/** Cronología: 100 a la primera, 70 a la segunda, 40 a la tercera, +1 por
 * segundo que sobre; sin acertar, 0. */
export function puntosCronologia(o: { acertado: boolean; intentos: number; sobra: number; nivel: Nivel }): number {
  if (!o.acertado) return 0;
  const base = ([100, 70, 40][o.intentos - 1] ?? 40) + Math.max(0, o.sobra);
  return Math.round(base * NIVELES[o.nivel].mult);
}

/** «1:05» */
export const reloj = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
