"use server";

import { permitido } from "@/lib/comparador/cargar";
import { getEquiposJugador } from "@/lib/sports/api-football";
import { CLUBES, JUGADORES, type ClubClave } from "@/lib/juegos/carreras";
import { caraDe } from "@/lib/juegos/caras";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";

/**
 * Tiki-taka-toe con cualquier jugador (23-oct, pedido del dueño: «Enzo
 * Fernández no sale»). Buscador de lib/juegos/buscar y validación con los
 * clubes reales del jugador (API /players/teams, caché 30 días) más la
 * carrera curada si es de la lista. Solo ids de las plantillas guardadas o
 * de la lista (permitido), para que nadie gaste cuota con ids al azar.
 */
/** Ids de club de la carrera curada de un jugador (si está en la lista). */
function clubesCurados(apiId: number): number[] {
  const j = JUGADORES.find((x) => caraDe(x.id)?.endsWith(`/${apiId}.png`));
  return j ? j.carrera.map((c) => CLUBES[c][0]) : [];
}

export async function validarCasilla(
  apiId: number,
  fila: ClubClave,
  columna: ClubClave,
): Promise<{ ok: boolean; error?: string }> {
  if (!(fila in CLUBES) || !(columna in CLUBES)) return { ok: false, error: "Casilla no válida" };
  if (!(await permitido(apiId))) return { ok: false, error: "Jugador no válido" };
  const deApi = await getEquiposJugador(apiId).catch(() => [] as number[]);
  const clubes = new Set([...deApi, ...clubesCurados(apiId)]);
  const ok = clubes.has(CLUBES[fila][0]) && clubes.has(CLUBES[columna][0]);
  // Todo futbolista tiene algún club: sin ninguno del API es que no se pudo
  // consultar (cuota, caída), no que no jugara. Se avisa y no gasta intento
  // (26-oct: Ansu Fati «no había jugado» en el Mónaco).
  if (!ok && deApi.length === 0) {
    return { ok: false, error: "No he podido comprobar sus clubes ahora mismo. Prueba en un momento." };
  }
  // Cada acierto sube al jugador en el buscador (migración 100).
  if (ok) await clienteServicio()?.rpc("sumar_uso_jugador", { p_id: apiId });
  return { ok };
}
