/**
 * Rachas de la quiniela (16-oct, pedido del dueño), a partir del historial
 * de `lq_historial_rachas()` (partidos ya empezados de cada jugador):
 *
 *  - Jornadas seguidas jugando: hacia atrás desde la jornada más reciente
 *    con partidos empezados. Si en la jornada en curso aún no ha jugado,
 *    no se rompe (puede que pronostique los que quedan): cuenta desde la
 *    anterior.
 *  - Aciertos seguidos: partidos terminados en orden de hora, con el signo
 *    acertado (exacto o 1X2). Se rompe con el primer fallo hacia atrás.
 *  - Mejor racha de aciertos de la temporada.
 */

export type FilaHistorial = {
  user_id: string;
  matchday: number;
  kickoff_at: string;
  finished: boolean;
  acierto: boolean;
};

export type Racha = { jornadas: number; aciertos: number; mejorAciertos: number };

export function calcularRachas(filas: FilaHistorial[]): Map<string, Racha> {
  const jornadasEmpezadas = [...new Set(filas.map((f) => f.matchday))].sort((a, b) => b - a);
  const porJugador = new Map<string, FilaHistorial[]>();
  for (const f of filas) porJugador.set(f.user_id, [...(porJugador.get(f.user_id) ?? []), f]);

  const out = new Map<string, Racha>();
  for (const [userId, suyas] of porJugador) {
    const jugadas = new Set(suyas.map((f) => f.matchday));
    let jornadas = 0;
    for (let i = 0; i < jornadasEmpezadas.length; i++) {
      if (jugadas.has(jornadasEmpezadas[i])) jornadas++;
      else if (i === 0) continue; // la jornada en curso aún no la ha jugado
      else break;
    }

    const terminadas = suyas
      .filter((f) => f.finished)
      .sort((a, b) => Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at));
    let actual = 0;
    let mejor = 0;
    for (const f of terminadas) {
      actual = f.acierto ? actual + 1 : 0;
      mejor = Math.max(mejor, actual);
    }
    out.set(userId, { jornadas, aciertos: actual, mejorAciertos: mejor });
  }
  return out;
}

/** Desde cuánto se enseña la llama en la clasificación. */
export const RACHA_JORNADAS_MIN = 3;
export const RACHA_ACIERTOS_MIN = 4;
