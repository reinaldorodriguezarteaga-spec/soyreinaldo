/**
 * Comprobación de favoritos SIN "use client" (17-oct): la usan tanto los
 * componentes de cliente (vía solo-favoritos) como el servidor
 * (HomeScoreboardTabs). Desde el servidor no se puede llamar a una función
 * de un módulo de cliente.
 */
/** Equipos ⭐ (id de API-Football). Las ligas no cuentan (17-oct, pedido
 * del dueño): con una liga seguida, "Solo favoritos" se llenaba de partidos. */
export type Seguidos = { equipos: number[] };

export function esDeFavoritos(
  seguidos: Seguidos,
  homeId: number,
  awayId: number,
): boolean {
  return seguidos.equipos.includes(homeId) || seguidos.equipos.includes(awayId);
}
