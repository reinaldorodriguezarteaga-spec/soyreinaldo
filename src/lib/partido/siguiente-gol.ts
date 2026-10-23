/**
 * «¿Quién marca el siguiente gol?» (23-oct, pedido del dueño: predicción en
 * directo). Se apuesta con el partido en juego; cuenta el primer gol marcado
 * al menos MARGEN minutos después del pronóstico (el directo llega con algo
 * de retraso: así nadie apuesta por un gol que ya ha visto en la tele). Si
 * el partido acaba sin ese gol, acierta «nadie».
 *
 * Sale del directo que ya guarda el cron (`partidos_directo`): no gasta cuota.
 */

export type Eleccion = "local" | "visitante" | "nadie";
export const ELECCIONES: Eleccion[] = ["local", "nadie", "visitante"];

/** Minutos de margen entre el pronóstico y el gol que cuenta. */
export const MARGEN = 2;
/** A partir de aquí ya no se apuesta (el «nadie» sería casi seguro). */
export const MINUTO_CIERRE = 80;

export type GolDirecto = { minuto: number; equipo: "local" | "visitante" };

/** Minuto que se guarda con el pronóstico: en el descanso, como si fuera el
 * 44 (vale cualquier gol de la segunda parte). */
export function minutoDePronostico(estado: string, transcurrido: number | null): number | null {
  if (estado === "HT") return 45 - MARGEN + 1;
  if (!["1H", "2H"].includes(estado) || transcurrido == null) return null;
  return transcurrido;
}

/** Qué pasó con un pronóstico: la elección correcta, o null si aún no se sabe. */
export function resolver(minuto: number, goles: GolDirecto[], terminado: boolean): Eleccion | null {
  const gol = [...goles].sort((a, b) => a.minuto - b.minuto).find((g) => g.minuto >= minuto + MARGEN);
  if (gol) return gol.equipo;
  return terminado ? "nadie" : null;
}

/** Goles del partido (ya reconciliados con el marcador) en el formato del
 * juego. El autogol cuenta para el rival. */
export function golesDe(goles: { minute: number | null; teamId: number; detail: string }[], localId: number): GolDirecto[] {
  return goles.map((g) => {
    const delLocal = g.teamId === localId;
    const local = g.detail === "Own Goal" ? !delLocal : delLocal;
    return { minuto: g.minute ?? 0, equipo: local ? "local" : "visitante" };
  });
}
