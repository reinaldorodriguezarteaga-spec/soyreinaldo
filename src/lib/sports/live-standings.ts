/**
 * Clasificación "en vivo": fusiona los marcadores de los partidos en juego
 * con la clasificación oficial de grupos. El API solo actualiza la tabla al
 * terminar cada partido, así que durante un partido la posición provisional
 * se calcula aquí, sumando el resultado parcial a la tabla oficial.
 *
 * Funciones puras, sin fetch — se usan en el server render y en cada poll
 * del cliente (pestaña "Marcador en vivo").
 */

import {
  isFinal,
  isLive,
  type Fixture,
  type StandingRow,
  type WcGroup,
} from "./api-football";

export type LiveRow = StandingRow & {
  /** El equipo está jugando ahora mismo. */
  isPlaying: boolean;
  /** Puestos ganados (+) o perdidos (−) respecto a la tabla oficial. */
  delta: number;
};

export type LiveGroup = {
  group: string;
  rows: LiveRow[];
  /** True si la tabla incluye algún resultado parcial (provisional). */
  adjusted: boolean;
};

/**
 * Fixtures que deben sumarse a la tabla oficial: los que están en juego, más
 * los que estaban en juego cuando se tomó el snapshot de la clasificación y
 * han terminado después (`carryIds`) — su resultado aún no está en la tabla
 * oficial que tiene el cliente, así que se siguen aplicando hasta recargar.
 */
export function pendingFixtures(
  fixtures: Fixture[],
  carryIds: ReadonlySet<number>,
): Fixture[] {
  return fixtures.filter(
    (f) => isLive(f) || (isFinal(f) && carryIds.has(f.fixture.id)),
  );
}

function applyResult(
  row: { points: number; goalsDiff: number; all: StandingRow["all"] },
  gf: number,
  gc: number,
) {
  row.all.played += 1;
  row.all.goals.for += gf;
  row.all.goals.against += gc;
  row.goalsDiff += gf - gc;
  if (gf > gc) {
    row.all.win += 1;
    row.points += 3;
  } else if (gf === gc) {
    row.all.draw += 1;
    row.points += 1;
  } else {
    row.all.lose += 1;
  }
}

/**
 * Aplica los resultados parciales de `pending` a la clasificación oficial y
 * reordena cada grupo (puntos → diferencia de goles → goles a favor → orden
 * oficial). Los partidos de eliminatorias no matchean ningún grupo y se
 * ignoran solos.
 */
export function mergeLiveStandings(
  groups: WcGroup[],
  pending: Fixture[],
): LiveGroup[] {
  return groups.map((g) => {
    const teamIds = new Set(g.rows.map((r) => r.team.id));
    const relevant = pending.filter(
      (f) => teamIds.has(f.teams.home.id) && teamIds.has(f.teams.away.id),
    );
    if (relevant.length === 0) {
      return {
        group: g.group,
        rows: g.rows.map((r) => ({ ...r, isPlaying: false, delta: 0 })),
        adjusted: false,
      };
    }

    const playing = new Set<number>();
    const rows = g.rows.map((r) => ({
      ...r,
      all: { ...r.all, goals: { ...r.all.goals } },
    }));
    const byTeam = new Map(rows.map((r) => [r.team.id, r]));

    for (const f of relevant) {
      const home = byTeam.get(f.teams.home.id)!;
      const away = byTeam.get(f.teams.away.id)!;
      const gh = f.goals.home ?? 0;
      const ga = f.goals.away ?? 0;
      if (isLive(f)) {
        playing.add(home.team.id);
        playing.add(away.team.id);
      }
      applyResult(home, gh, ga);
      applyResult(away, ga, gh);
    }

    const officialRank = new Map(g.rows.map((r) => [r.team.id, r.rank]));
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsDiff - a.goalsDiff ||
        b.all.goals.for - a.all.goals.for ||
        officialRank.get(a.team.id)! - officialRank.get(b.team.id)!,
    );

    return {
      group: g.group,
      adjusted: true,
      rows: rows.map((r, i) => ({
        ...r,
        rank: i + 1,
        isPlaying: playing.has(r.team.id),
        delta: officialRank.get(r.team.id)! - (i + 1),
      })),
    };
  });
}
