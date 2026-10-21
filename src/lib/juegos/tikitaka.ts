import { CLUBES, JUGADORES, type ClubClave, type Jugador } from "./carreras";
import { aleatorio } from "./diario";

/**
 * Tiki-taka-toe (21-oct): tablero 3×3 con un club en cada fila y en cada
 * columna; en cada casilla va un jugador que haya pasado por los dos. Cada
 * jugador vale para una sola casilla y hay nueve intentos.
 *
 * El tablero del día sale de la fecha y solo se aceptan tableros en los que
 * todas las casillas tienen respuesta en nuestra lista de carreras.
 */

export const MAX_INTENTOS_TT = 9;

export type Tablero = { filas: ClubClave[]; columnas: ClubClave[] };

const porClub = new Map<ClubClave, Set<string>>();
for (const j of JUGADORES) {
  for (const c of j.carrera) {
    if (!porClub.has(c)) porClub.set(c, new Set());
    porClub.get(c)!.add(j.id);
  }
}
/** Clubes con jugadores suficientes para cruzarse con otros. */
const CANDIDATOS = ([...porClub.entries()] as [ClubClave, Set<string>][])
  .filter(([, s]) => s.size >= 4)
  .map(([c]) => c)
  .sort();

export const jugaronEnAmbos = (a: ClubClave, b: ClubClave): Jugador[] =>
  JUGADORES.filter((j) => j.carrera.includes(a) && j.carrera.includes(b));

/** ¿Este jugador vale para la casilla? */
export const valeEn = (j: Jugador, fila: ClubClave, columna: ClubClave) =>
  j.carrera.includes(fila) && j.carrera.includes(columna);

/** ¿Se pueden rellenar las nueve casillas con jugadores distintos? */
function resoluble(t: Tablero): boolean {
  const casillas = t.filas.flatMap((f) => t.columnas.map((c) => jugaronEnAmbos(f, c).map((j) => j.id)));
  if (casillas.some((c) => c.length === 0)) return false;
  // Emparejamiento por búsqueda con vuelta atrás (son 9 casillas).
  const usados = new Set<string>();
  const orden = casillas.map((c, i) => [c, i] as const).sort((a, b) => a[0].length - b[0].length);
  const probar = (k: number): boolean => {
    if (k === orden.length) return true;
    for (const id of orden[k][0]) {
      if (usados.has(id)) continue;
      usados.add(id);
      if (probar(k + 1)) return true;
      usados.delete(id);
    }
    return false;
  };
  return probar(0);
}

export function tableroDelDia(numero: number): Tablero {
  const azar = aleatorio(numero * 7919);
  for (let intento = 0; intento < 5000; intento++) {
    const mezcla = [...CANDIDATOS].sort(() => azar() - 0.5).slice(0, 6);
    const t = { filas: mezcla.slice(0, 3), columnas: mezcla.slice(3) };
    if (resoluble(t)) return t;
  }
  // Nunca debería pasar; un tablero fijo que sabemos que vale.
  return { filas: ["barcelona", "madrid", "inter"], columnas: ["chelsea", "milan", "psg"] };
}

export const nombreClub = (c: ClubClave) => CLUBES[c][1];
