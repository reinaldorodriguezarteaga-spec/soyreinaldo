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

/**
 * El API repite filas: la misma línea con otro nombre («Euro» y «UEFA
 * European Championship» en 2004), copias sin id que reaparecen en varias
 * temporadas (una «King's Cup» con los números de la liga de 2022-23 en
 * cuatro temporadas de Cristiano) o una liga entera etiquetada como otra
 * competición. Sumadas, inflaban la carrera (Cristiano salía con 1019 goles,
 * 22-oct). Se quita toda fila idéntica a otra ya vista (mismo equipo,
 * partidos, titularidades, minutos y goles) con 3 partidos o más; las de 1-2
 * partidos pueden coincidir de verdad (dos supercopas de un partido).
 * Entre las repetidas se queda la que trae id de competición. Además: la
 * misma competición repetida sin id en la misma temporada, fuera; y una
 * supercopa con más de tres partidos, fuera (es otra mal etiquetada).
 */
export function sinDuplicados(stats: EstadisticaJugadorApi[]): EstadisticaJugadorApi[] {
  const firma = (s: EstadisticaJugadorApi) =>
    [s.team.id ?? s.team.name, s.games.appearences, s.games.lineups, s.games.minutes, s.goals.total].join("|");
  const orden = [...stats].sort((a, b) => Number(b.league.id != null) - Number(a.league.id != null));
  const vistas = new Set<string>();
  const fuera = new Set<EstadisticaJugadorApi>();
  for (const s of orden) {
    if ((s.games.appearences ?? 0) < 3) continue;
    const f = firma(s);
    if (vistas.has(f)) fuera.add(s);
    else vistas.add(f);
  }
  // La misma competición dos veces (mismo equipo y temporada): una con id y
  // otra sin él → la sin id es la copia fantasma.
  const nombre = (s: EstadisticaJugadorApi) => `${s.team.id ?? s.team.name}|${s.league.season}|${s.league.name.toLowerCase().trim()}`;
  const conId = new Set(stats.filter((s) => s.league.id != null).map(nombre));
  for (const s of stats) if (s.league.id == null && conId.has(nombre(s))) fuera.add(s);
  // Una supercopa no tiene más de tres partidos: si sale con más, es otra
  // competición mal etiquetada (la «Super Cup» de 31 partidos de Cristiano).
  for (const s of stats) {
    if (/super ?cup|supercopa|community shield|troph[eé]e des champions|supercoppa/i.test(s.league.name) && (s.games.appearences ?? 0) > 3) {
      fuera.add(s);
    }
  }
  return stats.filter((s) => !fuera.has(s));
}

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
export function sumar(stats: EstadisticaJugadorApi[], comps: string[] | string | null = null): Totales {
  // Una o varias competiciones (liga + Champions…); vacío o null = todas.
  const lista = comps == null ? [] : Array.isArray(comps) ? comps : [comps];
  const sel = stats.filter((s) => !esAmistoso(s) && (lista.length === 0 || lista.includes(claveCompeticion(s))));
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

/**
 * Torneos de verano (Mundial, Eurocopa, Copa América…): el API los apunta en
 * el año en que se juegan, que es el de inicio de la temporada SIGUIENTE (el
 * Mundial 2026 salía en la 2026-27 de Mbappé, 22-oct). Pertenecen a la que
 * acaba ese verano. Las clasificaciones y la Liga de Naciones no: se juegan
 * a lo largo de la temporada. El Mundial de Clubes es de verano desde 2025.
 */
export function esTorneoDeVerano(s: EstadisticaJugadorApi): boolean {
  const n = s.league.name.toLowerCase();
  if (/qualif|clasif/.test(n)) return false;
  if (/club world cup|mundial de clubes/.test(n)) return (s.league.season ?? 0) >= 2025;
  return /world cup|euro(pean)? championship|^euro\b|copa am[eé]rica|gold cup|confederations cup|finalissima|olympic/.test(n);
}

/** Las filas de la temporada `s`: lo suyo menos los torneos de verano (son
 * de la anterior) más los torneos de verano del año siguiente. */
export function filasDeTemporada(
  deEse: EstadisticaJugadorApi[],
  delSiguiente: EstadisticaJugadorApi[],
): EstadisticaJugadorApi[] {
  return [...deEse.filter((x) => !esTorneoDeVerano(x)), ...delSiguiente.filter(esTorneoDeVerano)];
}

/**
 * Temporada (de julio a junio) en la que el jugador cumple `edad` años. El
 * API solo da totales por temporada, y partido a partido no tiene nada antes
 * de 2016: la edad exacta (de cumpleaños a cumpleaños) no se puede calcular,
 * pero sí decir con verdad «la temporada en la que cumplió 18» (22-oct).
 * Messi (24-jun-1987) cumplió 18 en la 2004-05; Lamine (13-jul-2007), en la 2025-26.
 */
export function temporadaEnQueCumple(edad: number, nacimiento: string): number {
  const ano = Number(nacimiento.slice(0, 4));
  const mes = Number(nacimiento.slice(5, 7));
  return ano + edad - (mes < 7 ? 1 : 0);
}

/** Años que cumple durante la temporada `s` (la inversa de la anterior). */
export function edadQueCumple(s: number, nacimiento: string): number {
  const ano = Number(nacimiento.slice(0, 4));
  const mes = Number(nacimiento.slice(5, 7));
  return s - ano + (mes < 7 ? 1 : 0);
}

/** «2014-15» (o «2014» en competiciones de un solo año, que el API también
 * guarda con el año de inicio). */
export const nombreTemporada = (s: number) => `${s}-${String((s + 1) % 100).padStart(2, "0")}`;
