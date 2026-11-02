import type { Fixture, FixtureCard, FixtureGoal, PlayerStatLeader } from "./api-football";

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
 *
 * Desde el 2-nov, igual con las tarjetas (`/players/topyellowcards` va con el
 * mismo retraso): se suman las de los eventos de esos partidos.
 */
export const VENTANA_H = 48;

export type PartidoConGoles = { fx: Fixture; goals: FixtureGoal[] | null; cards?: FixtureCard[] | null };

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

type Stats = PlayerStatLeader["statistics"][number];

/** Aplica `cambio` a los jugadores del ranking con algo que sumar, les cuenta
 * los partidos pendientes jugados y reordena (estable) con `orden`. */
function sumar(
  lista: PlayerStatLeader[],
  tocados: Set<number>,
  jugo: Map<number, number>,
  cambio: (s: Stats, id: number) => Stats,
  orden: (a: Stats | undefined, b: Stats | undefined) => number,
): PlayerStatLeader[] {
  return lista
    .map((p, i) => {
      const s = p.statistics[0];
      const partidos = jugo.get(p.player.id) ?? 0;
      if (!s || (!tocados.has(p.player.id) && !partidos)) return { p, i };
      const nuevo = cambio(s, p.player.id);
      const games = { ...nuevo.games, appearences: (nuevo.games.appearences ?? 0) + partidos };
      return { p: { ...p, statistics: [{ ...nuevo, games }, ...p.statistics.slice(1)] }, i };
    })
    .sort((a, b) => orden(a.p.statistics[0], b.p.statistics[0]) || a.i - b.i)
    .map((x) => x.p);
}

const contar = (m: Map<number, number>, id: number) => m.set(id, (m.get(id) ?? 0) + 1);

/**
 * Suma a goleadores, asistidores y tarjeteros lo de `partidos` (los
 * pendientes, con sus goles ya reconciliados con el marcador). Los autogoles
 * no cuentan. Solo se tocan jugadores que ya están en el ranking: uno que no
 * sale con lo de antes no entra en el top con un partido.
 */
export function goleadoresAlDia(
  scorers: PlayerStatLeader[],
  assists: PlayerStatLeader[],
  partidos: PartidoConGoles[],
  tarjetas: PlayerStatLeader[] = [],
): {
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  cards: PlayerStatLeader[];
  adelantado: boolean;
} {
  const goles = new Map<number, number>();
  const pases = new Map<number, number>();
  const amarillas = new Map<number, number>();
  const rojas = new Map<number, number>();
  const dobles = new Map<number, number>();
  // Un partido pendiente cuenta como jugado para quien marcó, asistió o vio
  // tarjeta en él.
  const jugo = new Map<number, number>();
  for (const { goals, cards } of partidos) {
    const enEste = new Set<number>();
    for (const g of goals ?? []) {
      if (g.detail === "Own Goal") continue;
      if (g.playerId != null) {
        contar(goles, g.playerId);
        enEste.add(g.playerId);
      }
      if (g.assistId != null) {
        contar(pases, g.assistId);
        enEste.add(g.assistId);
      }
    }
    for (const c of cards ?? []) {
      if (c.playerId == null) continue;
      // Como el API en sus estadísticas: la segunda amarilla va a `yellowred`.
      if (/second yellow/i.test(c.detail)) contar(dobles, c.playerId);
      else if (/red/i.test(c.detail)) contar(rojas, c.playerId);
      else contar(amarillas, c.playerId);
      enEste.add(c.playerId);
    }
    for (const id of enEste) contar(jugo, id);
  }

  const idsGol = new Set([...goles.keys(), ...pases.keys()]);
  const idsTarjeta = new Set([...amarillas.keys(), ...rojas.keys(), ...dobles.keys()]);
  const enGol = [...scorers, ...assists].some((p) => idsGol.has(p.player.id));
  const enTarjeta = tarjetas.some((p) => idsTarjeta.has(p.player.id));
  const adelantado = enGol || enTarjeta;
  if (!adelantado) return { scorers, assists, cards: tarjetas, adelantado };

  const porCampo = (campo: "total" | "assists", suma: Map<number, number>) => ({
    cambio: (s: Stats, id: number): Stats => ({
      ...s,
      goals: { ...s.goals, [campo]: (s.goals[campo] ?? 0) + (suma.get(id) ?? 0) },
    }),
    orden: (a: Stats | undefined, b: Stats | undefined) => (b?.goals[campo] ?? 0) - (a?.goals[campo] ?? 0),
  });
  const g = porCampo("total", goles);
  const a = porCampo("assists", pases);
  return {
    scorers: enGol ? sumar(scorers, idsGol, jugo, g.cambio, g.orden) : scorers,
    assists: enGol ? sumar(assists, idsGol, jugo, a.cambio, a.orden) : assists,
    cards: enTarjeta
      ? sumar(
          tarjetas,
          idsTarjeta,
          jugo,
          (s, id) => ({
            ...s,
            cards: {
              yellow: (s.cards?.yellow ?? 0) + (amarillas.get(id) ?? 0),
              red: (s.cards?.red ?? 0) + (rojas.get(id) ?? 0),
              yellowred: (s.cards?.yellowred ?? 0) + (dobles.get(id) ?? 0),
            },
          }),
          // El ranking del API va por amarillas.
          (x, y) => (y?.cards?.yellow ?? 0) - (x?.cards?.yellow ?? 0),
        )
      : tarjetas,
    adelantado,
  };
}
