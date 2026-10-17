/**
 * Comprobación de favoritos SIN "use client" (17-oct): la usan tanto los
 * componentes de cliente (vía solo-favoritos) como el servidor
 * (HomeScoreboardTabs). Desde el servidor no se puede llamar a una función
 * de un módulo de cliente.
 */
/** Lo que el usuario sigue: equipos (id de API-Football) y ligas (slug). */
export type Seguidos = { equipos: number[]; ligas: string[] };

export function esDeFavoritos(
  seguidos: Seguidos,
  homeId: number,
  awayId: number,
  ligaSlug: string | null | undefined,
): boolean {
  return (
    seguidos.equipos.includes(homeId) ||
    seguidos.equipos.includes(awayId) ||
    (!!ligaSlug && seguidos.ligas.includes(ligaSlug))
  );
}
