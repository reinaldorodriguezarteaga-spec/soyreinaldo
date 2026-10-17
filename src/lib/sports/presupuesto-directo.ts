/** Reserva margen para persistir y cerrar antes de los 15 s de Vercel. */
export function tiempoDisponible(limite: number, maximo: number, reserva = 0, ahora = Date.now()): number {
  return Math.max(0, Math.min(maximo, limite - ahora - reserva));
}
