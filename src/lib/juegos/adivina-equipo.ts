import {
  LIGAS_JUEGO,
  LIGAS_POR_DIFICULTAD,
  RETOS,
  type Dificultad,
  type LigaJuego,
  type Reto,
} from "./equipos-historicos";

/**
 * Reglas de «Adivina el equipo»: cinco intentos y una pista nueva tras cada
 * fallo. El reto del día es el mismo para todos (sale de la fecha de Madrid);
 * la práctica elige al azar dentro de la dificultad.
 */

export const MAX_INTENTOS = 5;
/** Día 1 del reto diario. */
const INICIO = Date.UTC(2026, 9, 22);

export type EquipoOpcion = { id: number; nombre: string; liga: LigaJuego };

/** Equipos que no salen en los retos pero sí en la lista para elegir: sin
 * ellos, se adivinaría por descarte. Ids comprobados contra la API. */
const SEÑUELOS: EquipoOpcion[] = [
  { id: 532, nombre: "Valencia", liga: "laliga" },
  { id: 533, nombre: "Villarreal", liga: "laliga" },
  { id: 531, nombre: "Athletic Club", liga: "laliga" },
  { id: 548, nombre: "Real Sociedad", liga: "laliga" },
  { id: 543, nombre: "Real Betis", liga: "laliga" },
  { id: 34, nombre: "Newcastle", liga: "premier" },
  { id: 66, nombre: "Aston Villa", liga: "premier" },
  { id: 45, nombre: "Everton", liga: "premier" },
  { id: 48, nombre: "West Ham", liga: "premier" },
  { id: 487, nombre: "Lazio", liga: "seriea" },
  { id: 499, nombre: "Atalanta", liga: "seriea" },
  { id: 502, nombre: "Fiorentina", liga: "seriea" },
  { id: 80, nombre: "Olympique de Lyon", liga: "ligue1" },
  { id: 78, nombre: "Burdeos", liga: "ligue1" },
  { id: 174, nombre: "Schalke 04", liga: "bundesliga" },
  { id: 161, nombre: "Wolfsburgo", liga: "bundesliga" },
  { id: 173, nombre: "RB Leipzig", liga: "bundesliga" },
  { id: 172, nombre: "Stuttgart", liga: "bundesliga" },
];

export function retosDe(dificultad: Dificultad): Reto[] {
  const ligas = LIGAS_POR_DIFICULTAD[dificultad];
  return RETOS.filter((r) => ligas.includes(r.liga));
}

/** Equipos para elegir (los de los retos y los señuelos), por orden alfabético. */
export function opcionesDe(dificultad: Dificultad): EquipoOpcion[] {
  const ligas = LIGAS_POR_DIFICULTAD[dificultad];
  const porId = new Map<number, EquipoOpcion>();
  for (const r of RETOS) porId.set(r.equipoId, { id: r.equipoId, nombre: r.equipo, liga: r.liga });
  for (const s of SEÑUELOS) porId.set(s.id, s);
  return [...porId.values()].filter((e) => ligas.includes(e.liga)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Número del reto del día según la fecha de Madrid (1 = 22-oct-2026). */
export function numeroDelDia(ahora = new Date()): number {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" })
    .format(ahora)
    .split("-")
    .map(Number);
  return Math.max(1, Math.floor((Date.UTC(y, m - 1, d) - INICIO) / 86_400_000) + 1);
}

/** Barajado fijo (LCG con semilla): cada vuelta completa a la lista sale en
 * otro orden, y nunca se repite un reto hasta haber salido todos. */
function barajado(vuelta: number): Reto[] {
  let s = Math.imul(vuelta + 1, 2654435761) >>> 0;
  const r = [...RETOS];
  for (let i = r.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function retoDelDia(numero: number): Reto {
  const i = numero - 1;
  return barajado(Math.floor(i / RETOS.length))[i % RETOS.length];
}

export type Pista = { titulo: string; texto: string };

/** Pistas desbloqueadas tras `fallos` fallos: liga, temporada, partido y
 * luego el nombre de la estrella (el primer delantero). */
export function pistas(reto: Reto, fallos: number): Pista[] {
  const delantero = reto.lineas[reto.lineas.length - 1];
  const estrella = delantero[Math.floor(delantero.length / 2)][0];
  const todas: Pista[] = [
    { titulo: "Liga", texto: LIGAS_JUEGO[reto.liga] },
    { titulo: "Temporada", texto: reto.temporada },
    { titulo: "Partido", texto: reto.contexto },
    { titulo: "Uno de ellos", texto: estrella },
  ];
  return todas.slice(0, Math.min(fallos, todas.length));
}

/** Texto para compartir, estilo Wordle: un cuadro por intento. */
export function textoCompartir(opts: { numero: number | null; acertado: boolean; intentos: number }): string {
  const cuadros = Array.from({ length: opts.intentos }, (_, i) =>
    opts.acertado && i === opts.intentos - 1 ? "🟩" : "🟥",
  ).join("");
  const cab = opts.numero ? `Adivina el equipo #${opts.numero}` : "Adivina el equipo";
  const nota = opts.acertado ? `${opts.intentos}/${MAX_INTENTOS}` : `X/${MAX_INTENTOS}`;
  return `${cab} · ${nota}\n${cuadros}\nsoyreinaldo.com/juegos/adivina-el-equipo`;
}
