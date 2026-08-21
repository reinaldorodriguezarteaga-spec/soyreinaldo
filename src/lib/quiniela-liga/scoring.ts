/**
 * Puntuación de un pronóstico.
 *
 * Vive aquí, fuera de los componentes, para que se pueda probar sin montar
 * media aplicación. La fuente de verdad de la clasificación sigue siendo
 * `lq_leaderboard()` en SQL; esto tiene que dar exactamente lo mismo, y por
 * eso está cubierto por pruebas.
 */

export type Marcador = { home: number; away: number };

export type Baremo = {
  /** Puntos por clavar el resultado exacto. */
  exacto: number;
  /** Puntos por acertar solo quién gana (o el empate). */
  acierto: number;
};

export const BAREMO_POR_DEFECTO: Baremo = { exacto: 3, acierto: 1 };

/** Signo del resultado: 1 gana local, -1 gana visitante, 0 empate. */
function signo(m: Marcador): number {
  return Math.sign(m.home - m.away);
}

export function puntosPronostico(
  pronostico: Marcador,
  real: Marcador,
  baremo: Baremo = BAREMO_POR_DEFECTO,
): number {
  if (pronostico.home === real.home && pronostico.away === real.away) {
    return baremo.exacto;
  }
  return signo(pronostico) === signo(real) ? baremo.acierto : 0;
}
