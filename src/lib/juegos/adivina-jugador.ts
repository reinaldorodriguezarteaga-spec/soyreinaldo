import { JUGADORES, type Jugador } from "./carreras";
import { delDia } from "./diario";

/**
 * «Adivina el jugador»: su carrera, club a club, y cinco intentos. Cada
 * fallo da una pista: posición, país, año de nacimiento e iniciales.
 */

export const MAX_INTENTOS = 5;

const POSICION = { POR: "Portero", DEF: "Defensa", MED: "Centrocampista", DEL: "Delantero" } as const;

/** El del día, solo entre carreras de tres clubes o más: con dos (Messi,
 * Xavi, Müller…) el reto se resuelve de un vistazo. Esos quedan para la
 * práctica. */
export const DEL_DIA = JUGADORES.filter((j) => j.carrera.length >= 3);
export const jugadorDelDia = (numero: number): Jugador => delDia(DEL_DIA, numero);

export type PistaJugador = { titulo: string; texto: string; bandera?: string };

export function pistasJugador(j: Jugador, fallos: number): PistaJugador[] {
  const iniciales = j.nombre
    .split(" ")
    .map((p) => `${p[0]}.`)
    .join(" ");
  const todas: PistaJugador[] = [
    { titulo: "Posición", texto: POSICION[j.pos] },
    { titulo: "País", texto: "", bandera: j.pais },
    { titulo: "Nació en", texto: String(j.nacido) },
    { titulo: "Iniciales", texto: iniciales },
  ];
  return todas.slice(0, Math.min(fallos, todas.length));
}

export function textoCompartirJugador(opts: { numero: number | null; acertado: boolean; intentos: number }): string {
  const cuadros = Array.from({ length: opts.intentos }, (_, i) =>
    opts.acertado && i === opts.intentos - 1 ? "🟩" : "🟥",
  ).join("");
  const cab = opts.numero ? `Adivina el jugador #${opts.numero}` : "Adivina el jugador";
  const nota = opts.acertado ? `${opts.intentos}/${MAX_INTENTOS}` : `X/${MAX_INTENTOS}`;
  return `${cab} · ${nota}\n${cuadros}\nsoyreinaldo.com/juegos/adivina-el-jugador`;
}
