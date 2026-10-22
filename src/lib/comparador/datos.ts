import type { EstadisticaJugadorApi } from "@/lib/sports/api-football";

/**
 * Comparador de jugadores (22-oct, pedido del dueño, al estilo de Messi vs
 * Cristiano): cada lado elige jugador, temporada (o toda la carrera) y
 * competición (o todas). Aquí, lo puro: sumar las competiciones elegidas y
 * las filas que se comparan. Los amistosos no cuentan nunca.
 */

export type Totales = {
  partidos: number;
  titular: number;
  minutos: number;
  goles: number;
  asistencias: number | null;
  penMarcados: number | null;
  penFallados: number | null;
  tiros: number | null;
  tirosPuerta: number | null;
  pasesClave: number | null;
  regates: number | null;
  duelosGanados: number | null;
  entradas: number | null;
  intercepciones: number | null;
  faltasRecibidas: number | null;
  amarillas: number;
  rojas: number;
  paradas: number | null;
  encajados: number | null;
  /** Media ponderada por minutos de las competiciones que tienen nota. */
  valoracion: number | null;
};

export type CompeticionJugador = { clave: string; nombre: string; logo: string | null };

const AMISTOSO = /friendl/i;
export const esAmistoso = (s: EstadisticaJugadorApi) => AMISTOSO.test(s.league.name);
export const claveCompeticion = (s: EstadisticaJugadorApi) => String(s.league.id ?? s.league.name);

/** Competiciones de una lista de estadísticas (sin amistosos), sin repetir. */
export function competiciones(stats: EstadisticaJugadorApi[]): CompeticionJugador[] {
  const m = new Map<string, CompeticionJugador>();
  for (const s of stats) {
    if (esAmistoso(s)) continue;
    const k = claveCompeticion(s);
    if (!m.has(k)) m.set(k, { clave: k, nombre: s.league.name, logo: s.league.logo });
  }
  return [...m.values()];
}

/** Suma de las estadísticas (los nulos del API no cuentan como cero: si
 * ninguna competición trae un dato, el total es null y se enseña «—»). */
export function sumar(stats: EstadisticaJugadorApi[], comp: string | null = null): Totales {
  const sel = stats.filter((s) => !esAmistoso(s) && (comp == null || claveCompeticion(s) === comp));
  const n = (f: (s: EstadisticaJugadorApi) => number | null | undefined): number | null => {
    let hay = false;
    let t = 0;
    for (const s of sel) {
      const v = f(s);
      if (typeof v === "number") {
        hay = true;
        t += v;
      }
    }
    return hay ? t : null;
  };
  let pesoNota = 0;
  let sumaNota = 0;
  for (const s of sel) {
    const r = Number(s.games.rating);
    const min = s.games.minutes ?? 0;
    if (s.games.rating && Number.isFinite(r) && min > 0) {
      pesoNota += min;
      sumaNota += r * min;
    }
  }
  return {
    partidos: n((s) => s.games.appearences) ?? 0,
    titular: n((s) => s.games.lineups) ?? 0,
    minutos: n((s) => s.games.minutes) ?? 0,
    goles: n((s) => s.goals.total) ?? 0,
    asistencias: n((s) => s.goals.assists),
    penMarcados: n((s) => s.penalty.scored),
    penFallados: n((s) => s.penalty.missed),
    tiros: n((s) => s.shots.total),
    tirosPuerta: n((s) => s.shots.on),
    pasesClave: n((s) => s.passes.key),
    regates: n((s) => s.dribbles.success),
    duelosGanados: n((s) => s.duels.won),
    entradas: n((s) => s.tackles.total),
    intercepciones: n((s) => s.tackles.interceptions),
    faltasRecibidas: n((s) => s.fouls.drawn),
    amarillas: n((s) => s.cards.yellow) ?? 0,
    rojas: (n((s) => s.cards.red) ?? 0) + (n((s) => s.cards.yellowred) ?? 0),
    paradas: n((s) => s.goals.saves),
    encajados: n((s) => s.goals.conceded),
    valoracion: pesoNota > 0 ? Math.round((sumaNota / pesoNota) * 100) / 100 : null,
  };
}

export type Fila = {
  etiqueta: string;
  a: number | null;
  b: number | null;
  /** Cómo se escribe el número. */
  formato?: "entero" | "decimal" | "pct";
  /** true → gana el menor (tarjetas, minutos por gol). */
  menosEsMejor?: boolean;
};

const div = (x: number | null, y: number | null, k = 1) => (x == null || !y ? null : (x / y) * k);

/** Las filas del comparador. Se esconden las que no tienen dato en ningún lado. */
export function filas(a: Totales, b: Totales): Fila[] {
  const ga = (t: Totales) => t.goles + (t.asistencias ?? 0);
  const todas: Fila[] = [
    { etiqueta: "Partidos", a: a.partidos, b: b.partidos },
    { etiqueta: "Titular", a: a.titular, b: b.titular },
    { etiqueta: "Minutos", a: a.minutos, b: b.minutos },
    { etiqueta: "Goles", a: a.goles, b: b.goles },
    { etiqueta: "Asistencias", a: a.asistencias, b: b.asistencias },
    { etiqueta: "Goles + asistencias", a: ga(a), b: ga(b) },
    { etiqueta: "Goles por partido", a: div(a.goles, a.partidos), b: div(b.goles, b.partidos), formato: "decimal" },
    { etiqueta: "Minutos por gol", a: div(a.minutos, a.goles), b: div(b.minutos, b.goles), menosEsMejor: true },
    { etiqueta: "Penaltis marcados", a: a.penMarcados, b: b.penMarcados },
    {
      etiqueta: "Acierto en penaltis",
      a: div(a.penMarcados, (a.penMarcados ?? 0) + (a.penFallados ?? 0), 100),
      b: div(b.penMarcados, (b.penMarcados ?? 0) + (b.penFallados ?? 0), 100),
      formato: "pct",
    },
    { etiqueta: "Tiros", a: a.tiros, b: b.tiros },
    { etiqueta: "Tiros a puerta", a: a.tirosPuerta, b: b.tirosPuerta },
    { etiqueta: "Pases clave", a: a.pasesClave, b: b.pasesClave },
    { etiqueta: "Regates completados", a: a.regates, b: b.regates },
    { etiqueta: "Duelos ganados", a: a.duelosGanados, b: b.duelosGanados },
    { etiqueta: "Entradas", a: a.entradas, b: b.entradas },
    { etiqueta: "Intercepciones", a: a.intercepciones, b: b.intercepciones },
    { etiqueta: "Faltas recibidas", a: a.faltasRecibidas, b: b.faltasRecibidas },
    { etiqueta: "Paradas", a: a.paradas, b: b.paradas },
    { etiqueta: "Goles encajados", a: a.encajados, b: b.encajados, menosEsMejor: true },
    { etiqueta: "Amarillas", a: a.amarillas, b: b.amarillas, menosEsMejor: true },
    { etiqueta: "Rojas", a: a.rojas, b: b.rojas, menosEsMejor: true },
    { etiqueta: "Valoración media", a: a.valoracion, b: b.valoracion, formato: "decimal" },
  ];
  return todas.filter((f) => (f.a != null && f.a !== 0) || (f.b != null && f.b !== 0));
}

export function formatear(v: number | null, f: Fila["formato"] = "entero"): string {
  if (v == null) return "—";
  if (f === "pct") return `${Math.round(v)}%`;
  if (f === "decimal") return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Math.round(v).toLocaleString("es-ES");
}

/** «2014-15» (o «2014» en competiciones de un solo año, que el API también
 * guarda con el año de inicio). */
export const nombreTemporada = (s: number) => `${s}-${String((s + 1) % 100).padStart(2, "0")}`;
