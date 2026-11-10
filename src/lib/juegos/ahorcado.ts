import "server-only";
import { aleatorio, delDia } from "./diario";
import { LIGAS_AHORCADO, type PartidaAhorcado } from "./ahorcado-comun";
import { FUTBOLISTAS } from "./futbolistas";
import type { Futbolista } from "./futbolistas-comun";

export { LIGAS_AHORCADO };

/**
 * «Ahorcado» (10-nov-2026, pedido del dueño): adivinar el apellido de un
 * futbolista actual letra a letra sabiendo solo la liga en la que juega.
 * Cinco fallos: cabeza, dos piernas, dos brazos y ahorcado. Los jugadores
 * vienen de `futbolistas.ts`. Al navegador va un jugador cada vez.
 */

/** Fuera los apellidos demasiado cortos para un ahorcado («Kane» sí, «Kim» no). */
const JUGADORES = FUTBOLISTAS.filter((j) => j.apellido.replace(/[^\p{L}]/gu, "").length >= 4);

function partida(j: Futbolista): PartidaAhorcado {
  return {
    id: j.id,
    nombre: j.nombre,
    palabra: j.apellido,
    liga: j.liga,
    equipo: j.equipo,
    pais: j.pais,
    posicion: j.posicion,
  };
}

/** El jugador del reto del día: el mismo para todos. */
export const ahorcadoDelDia = (numero: number) => partida(delDia(JUGADORES, numero));

/** Uno al azar para practicar (de una liga, si se pide), sin repetir. */
export function ahorcadoPractica(liga: number | undefined, vistos: number[] = [], semilla = Date.now()): PartidaAhorcado | null {
  const pool = JUGADORES.filter((j) => !liga || j.liga.id === liga);
  if (pool.length === 0) return null;
  const libres = pool.filter((j) => !vistos.includes(j.id));
  const de = libres.length ? libres : pool;
  return partida(de[Math.floor(aleatorio(semilla)() * de.length)]);
}

export const totalAhorcado = () => JUGADORES.length;
