import "server-only";
import datos from "./ahorcado-datos.json";
import { LIGAS_AHORCADO } from "./ahorcado-comun";
import type { Futbolista } from "./futbolistas-comun";

/**
 * Futbolistas de hoy para los juegos (Ahorcado, Futbolista misterioso, Foto
 * oculta): titulares de esta temporada de los grandes de LaLiga, Premier y
 * Champions. Salen de `scripts/juego-ahorcado.mjs` (`ahorcado-datos.json`):
 * los juegos no gastan cuota. Solo servidor.
 */

type Jugador = {
  id: number;
  n: string;
  f: string | null;
  l: string | null;
  p: string | null;
  eq: number;
  liga: number;
  pos: string | null;
  nac: string | null;
  dorsal: number | null;
  b: string | null;
  foto: boolean;
};

export const EQUIPOS: Record<number, string> = {
  529: "Barcelona", 541: "Real Madrid", 530: "Atlético de Madrid", 531: "Athletic Club", 548: "Real Sociedad",
  533: "Villarreal", 543: "Real Betis", 536: "Sevilla",
  33: "Manchester United", 50: "Manchester City", 40: "Liverpool", 49: "Chelsea", 42: "Arsenal", 47: "Tottenham",
  34: "Newcastle", 66: "Aston Villa",
  157: "Bayern de Múnich", 165: "Borussia Dortmund", 168: "Bayer Leverkusen", 85: "PSG", 505: "Inter de Milán",
  489: "AC Milan", 496: "Juventus", 492: "Nápoles", 211: "Benfica", 212: "Oporto",
};

export const POSICION: Record<string, string> = { Goalkeeper: "Portero", Defender: "Defensa", Midfielder: "Centrocampista", Attacker: "Delantero" };

/** El nombre por el que se le conoce, cuando la API no lo da bien. Revisado
 * a mano el 10-nov-2026. */
const NOMBRES: Record<number, string> = {
  7334: "Karim Adeyemi",
  1149: "Dayot Upamecano",
  396623: "Pau Cubarsí",
  2935: "Harry Maguire",
  67971: "Marc Guéhi",
  156477: "Rayan Cherki",
  19599: "Emiliano Martínez",
  136723: "Noni Madueke",
  237087: "Enzo Fernández",
  3406: "Zambo Anguissa",
  366735: "Joshua Acheampong",
  294824: "Nathan Saliba",
  395559: "Kerim Alajbegović",
  388872: "Victor Froholdt",
  409215: "Joane Gadou",
};

/** «L. Yamal» → «Lamine Yamal»: la inicial se cambia por el nombre de pila
 * que empieza por esa letra; si no hay ninguno, solo el apellido. */
function nombreDe(j: Jugador): string {
  if (NOMBRES[j.id]) return NOMBRES[j.id];
  const m = j.n.match(/^(\p{L})\.\s*(.+)$/u);
  if (!m) return j.n;
  const pila = (j.f ?? "").split(/\s+/).find((w) => w.startsWith(m[1]));
  return pila ? `${pila.split("-")[0]} ${m[2]}` : m[2];
}

/** Partículas que van con el apellido: «van Dijk», «De Bruyne», «Di Lorenzo». */
const PARTICULAS = new Set(["van", "von", "de", "der", "den", "di", "da", "del", "dos", "le", "la", "mac", "mc", "el", "ten", "ter"]);

/** Lo que se adivina: el apellido (pedido del dueño, 10-nov: «así es más
 * fácil»). Se quita el nombre de pila; las partículas se quedan con el
 * apellido. Los de un solo nombre, tal cual. */
const APELLIDO: Record<number, string> = {
  762: "Vinícius", // «Vinícius Júnior»: se le conoce por el nombre
  21104: "Kolo Muani",
  3406: "Zambo Anguissa",
};
function palabraDe(j: Jugador): string {
  if (APELLIDO[j.id]) return APELLIDO[j.id];
  const partes = nombreDe(j).split(" ");
  if (partes.length === 1) return partes[0];
  let i = partes.length - 1;
  while (i > 1 && PARTICULAS.has(partes[i - 1].toLowerCase())) i--;
  return partes.slice(i).join(" ");
}


function edad(nac: string | null, hoy = new Date()): number | null {
  if (!nac) return null;
  const n = new Date(nac);
  if (Number.isNaN(n.getTime())) return null;
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) e--;
  return e;
}

function futbolista(j: Jugador): Futbolista {
  return {
    id: j.id,
    nombre: nombreDe(j),
    apellido: palabraDe(j),
    liga: { id: j.liga, nombre: LIGAS_AHORCADO[j.liga] ?? "" },
    equipo: { id: j.eq, nombre: EQUIPOS[j.eq] ?? "" },
    posicion: j.pos ? (POSICION[j.pos] ?? null) : null,
    edad: edad(j.nac),
    dorsal: j.dorsal,
    bandera: j.b,
    pais: j.p,
    foto: j.foto,
  };
}

/** Todos, ya con nombre, apellido, edad y equipo en español. */
export const FUTBOLISTAS: Futbolista[] = (datos.jugadores as Jugador[]).map(futbolista);
