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

/**
 * Igual que `mergeLiveStandings`, pero para una tabla PLANA
 * (`standingsMode: "table"` — LaLiga, Champions, etc., no el Mundial por
 * grupos). Todos los equipos de la competición caben en un único grupo
 * sintético: como `mergeLiveStandings` no hace nada específico de grupos
 * aparte de emparejar rivales dentro de sus `teamIds`, envolver y
 * desenvolver un array de un elemento reutiliza toda la lógica sin
 * duplicarla.
 */
export function mergeLiveStandingsFlat(
  standings: StandingRow[],
  pending: Fixture[],
): LiveRow[] {
  const [merged] = mergeLiveStandings([{ group: "", rows: standings }], pending);
  return merged.rows;
}

/**
 * Completa la clasificación oficial con los partidos TERMINADOS que el API
 * todavía no ha contado (25-oct, pedido del dueño: el Betis empató 0-0 y la
 * tabla seguía sin el partido y con su última victoria). El `/standings` de
 * API-Football se queda horas atrás y hasta se contradice (tras un Rayo-Elche,
 * Elche con 10 jugados y Rayo con 9), mientras que los resultados del
 * calendario llegan al momento.
 *
 * Por equipo: si el calendario tiene más partidos de liga terminados que los
 * `played` de la tabla, se suman los que faltan (los más recientes) solo a
 * ese equipo. Así cuadra aunque el API haya contado el partido para uno de
 * los dos y no para el otro. Solo tablas únicas (sin grupos ni conferencias)
 * y como mucho 3 partidos por equipo: con más diferencia algo raro pasa y se
 * deja la oficial. Al reordenar no se aplica el enfrentamiento directo (se
 * desempata por diferencia de goles, goles a favor y el orden oficial).
 */
export function completarClasificacion(rows: StandingRow[], fixtures: Fixture[]): StandingRow[] {
  if (rows.length === 0 || new Set(rows.map((r) => r.group ?? "")).size > 1) return rows;
  const ids = new Set(rows.map((r) => r.team.id));
  const terminados = fixtures
    .filter(
      (f) =>
        isFinal(f) &&
        ids.has(f.teams.home.id) &&
        ids.has(f.teams.away.id) &&
        f.goals.home != null &&
        f.goals.away != null &&
        /regular season/i.test(f.league.round ?? ""),
    )
    .sort((a, b) => Date.parse(a.fixture.date) - Date.parse(b.fixture.date));

  let cambios = false;
  const nuevas = rows.map((r) => {
    const suyos = terminados.filter((f) => f.teams.home.id === r.team.id || f.teams.away.id === r.team.id);
    const faltan = suyos.length - r.all.played;
    if (faltan <= 0 || faltan > 3) return r;
    cambios = true;
    const fila: StandingRow = {
      ...r,
      all: { ...r.all, goals: { ...r.all.goals } },
      home: r.home && { ...r.home, goals: { ...r.home.goals } },
      away: r.away && { ...r.away, goals: { ...r.away.goals } },
    };
    let forma = "";
    for (const f of suyos.slice(-faltan)) {
      const enCasa = f.teams.home.id === r.team.id;
      const gf = (enCasa ? f.goals.home : f.goals.away)!;
      const gc = (enCasa ? f.goals.away : f.goals.home)!;
      applyResult(fila, gf, gc);
      const lado = enCasa ? fila.home : fila.away;
      if (lado) {
        lado.played += 1;
        lado.goals.for += gf;
        lado.goals.against += gc;
        if (gf > gc) lado.win += 1;
        else if (gf === gc) lado.draw += 1;
        else lado.lose += 1;
      }
      // La forma va del más reciente al más antiguo.
      forma = (gf > gc ? "W" : gf === gc ? "D" : "L") + forma;
    }
    fila.form = r.form != null ? (forma + r.form).slice(0, Math.max(5, r.form.length)) : forma;
    return fila;
  });
  if (!cambios) return rows;

  const oficial = new Map(rows.map((r) => [r.team.id, r.rank]));
  return nuevas
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsDiff - a.goalsDiff ||
        b.all.goals.for - a.all.goals.for ||
        oficial.get(a.team.id)! - oficial.get(b.team.id)!,
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
