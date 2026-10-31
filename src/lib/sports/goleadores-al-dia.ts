import type { Fixture, FixtureGoal, PlayerStatLeader } from "./api-football";

/**
 * Goleadores y asistidores «al día» (1-nov-2026). El ranking oficial del API
 * (`/players/topscorers`, `/players/topassists`) tarda horas en sumar un
 * partido: tras el Barça-Alavés, Lamine y Raphinha seguían con los goles de
 * antes. Aquí se suman a mano los goles de los partidos que el ranking aún no
 * cuenta, sacados de los eventos de cada partido (en vivo o terminado).
 *
 * ¿Qué partidos no cuenta? Los partidos que lleva un jugador en el ranking
 * (`appearences`) dicen hasta dónde ha llegado: el que más tiene de cada
 * equipo marca cuántos partidos del equipo están ya sumados. Los siguientes,
 * en orden de fecha, están pendientes. Para no sumar dos veces un gol si esa
 * cuenta se queda corta (nadie del ranking jugó todos los partidos), solo se
 * miran partidos de las últimas `VENTANA_H` horas.
 */
export const VENTANA_H = 48;

export type PartidoConGoles = { fx: Fixture; goals: FixtureGoal[] | null };

const estadoJugado = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT", "FT", "AET", "PEN"]);

/** Partidos que el ranking todavía no ha sumado, por equipo. */
export function partidosPendientes(
  listas: PlayerStatLeader[][],
  partidos: Fixture[],
  ahora = Date.now(),
): Fixture[] {
  const sumados = new Map<number, number>();
  for (const p of listas.flat()) {
    const s = p.statistics[0];
    if (!s) continue;
    sumados.set(s.team.id, Math.max(sumados.get(s.team.id) ?? 0, s.games.appearences ?? 0));
  }
  const porId = new Map<number, Fixture>();
  for (const f of partidos) if (estadoJugado.has(f.fixture.status.short)) porId.set(f.fixture.id, f);
  const jugados = [...porId.values()].sort((a, b) => Date.parse(a.fixture.date) - Date.parse(b.fixture.date));

  const pendientes = new Map<number, Fixture>();
  for (const [equipo, n] of sumados) {
    const suyos = jugados.filter((f) => f.teams.home.id === equipo || f.teams.away.id === equipo);
    for (const f of suyos.slice(n)) {
      if (ahora - Date.parse(f.fixture.date) <= VENTANA_H * 3_600_000) pendientes.set(f.fixture.id, f);
    }
  }
  return [...pendientes.values()];
}

function sumar(
  lista: PlayerStatLeader[],
  suma: Map<number, number>,
  jugo: Map<number, number>,
  campo: "total" | "assists",
): PlayerStatLeader[] {
  return lista
    .map((p, i) => {
      const extra = suma.get(p.player.id) ?? 0;
      const s = p.statistics[0];
      const partidos = jugo.get(p.player.id) ?? 0;
      if (!s || (!extra && !partidos)) return { p, i };
      const goals = { ...s.goals, [campo]: (s.goals[campo] ?? 0) + extra };
      const games = { ...s.games, appearences: (s.games.appearences ?? 0) + partidos };
      return { p: { ...p, statistics: [{ ...s, goals, games }, ...p.statistics.slice(1)] }, i };
    })
    .sort((a, b) => (b.p.statistics[0]?.goals[campo] ?? 0) - (a.p.statistics[0]?.goals[campo] ?? 0) || a.i - b.i)
    .map((x) => x.p);
}

/**
 * Suma a goleadores y asistidores lo de `partidos` (los pendientes, con sus
 * goles ya reconciliados con el marcador). Los autogoles no cuentan. Solo se
 * tocan jugadores que ya están en el ranking: uno que no sale con lo de antes
 * no entra en el top con un partido.
 */
export function goleadoresAlDia(
  scorers: PlayerStatLeader[],
  assists: PlayerStatLeader[],
  partidos: PartidoConGoles[],
): { scorers: PlayerStatLeader[]; assists: PlayerStatLeader[]; adelantado: boolean } {
  const goles = new Map<number, number>();
  const pases = new Map<number, number>();
  // Un partido pendiente cuenta como jugado para quien marcó o asistió en él.
  const jugo = new Map<number, number>();
  for (const { goals } of partidos) {
    const enEste = new Set<number>();
    for (const g of goals ?? []) {
      if (g.detail === "Own Goal") continue;
      if (g.playerId != null) {
        goles.set(g.playerId, (goles.get(g.playerId) ?? 0) + 1);
        enEste.add(g.playerId);
      }
      if (g.assistId != null) {
        pases.set(g.assistId, (pases.get(g.assistId) ?? 0) + 1);
        enEste.add(g.assistId);
      }
    }
    for (const id of enEste) jugo.set(id, (jugo.get(id) ?? 0) + 1);
  }
  const ids = new Set([...scorers, ...assists].map((p) => p.player.id));
  const adelantado = [...goles.keys(), ...pases.keys()].some((id) => ids.has(id));
  if (!adelantado) return { scorers, assists, adelantado };
  return {
    scorers: sumar(scorers, goles, jugo, "total"),
    assists: sumar(assists, pases, jugo, "assists"),
    adelantado,
  };
}
