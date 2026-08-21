/**
 * Proyección de la clasificación: en qué puesto quedaría cada equipo según
 * cómo acabe un partido.
 *
 * Es una aproximación deliberada y así se dice en la interfaz: reordena por
 * puntos y diferencia de goles, pero no puede saber por cuánto se va a ganar
 * ni aplica el desempate por enfrentamiento directo que usa LaLiga.
 */

export type FilaClasificacion = {
  teamId: number;
  points: number;
  goalsDiff: number;
  goalsFor: number;
};

export type Posiciones = { local: number; visitante: number };

export function proyectarPosiciones(
  filas: FilaClasificacion[],
  homeId: number,
  awayId: number,
  puntosLocal: number,
  puntosVisitante: number,
): Posiciones {
  const proyectada = filas.map((f) => ({
    teamId: f.teamId,
    points:
      f.points +
      (f.teamId === homeId
        ? puntosLocal
        : f.teamId === awayId
          ? puntosVisitante
          : 0),
    goalsDiff: f.goalsDiff,
    goalsFor: f.goalsFor,
  }));

  proyectada.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsDiff - a.goalsDiff ||
      b.goalsFor - a.goalsFor,
  );

  return {
    local: proyectada.findIndex((t) => t.teamId === homeId) + 1,
    visitante: proyectada.findIndex((t) => t.teamId === awayId) + 1,
  };
}
