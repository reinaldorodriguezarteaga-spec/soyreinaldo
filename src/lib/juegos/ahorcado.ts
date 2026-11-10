import "server-only";
import datos from "./ahorcado-datos.json";
import { aleatorio, delDia } from "./diario";
import { LIGAS_AHORCADO, type PartidaAhorcado } from "./ahorcado-comun";

export { LIGAS_AHORCADO };

/**
 * «Ahorcado» (10-nov-2026, pedido del dueño): adivinar a un futbolista
 * actual letra a letra sabiendo solo la liga en la que juega. Cinco fallos:
 * cabeza, dos piernas, dos brazos y ahorcado.
 *
 * Los jugadores salen de `scripts/juego-ahorcado.mjs` (titulares de esta
 * temporada de los grandes de LaLiga, Premier y Champions) y viven en
 * `ahorcado-datos.json`: el juego no gasta cuota. Solo servidor: al
 * navegador va un jugador cada vez.
 */

type Jugador = { id: number; n: string; f: string | null; l: string | null; p: string | null; eq: number; liga: number; pos: string | null };

const EQUIPOS: Record<number, string> = {
  529: "Barcelona", 541: "Real Madrid", 530: "Atlético de Madrid", 531: "Athletic Club", 548: "Real Sociedad",
  533: "Villarreal", 543: "Real Betis", 536: "Sevilla",
  33: "Manchester United", 50: "Manchester City", 40: "Liverpool", 49: "Chelsea", 42: "Arsenal", 47: "Tottenham",
  34: "Newcastle", 66: "Aston Villa",
  157: "Bayern de Múnich", 165: "Borussia Dortmund", 168: "Bayer Leverkusen", 85: "PSG", 505: "Inter de Milán",
  489: "AC Milan", 496: "Juventus", 492: "Nápoles", 211: "Benfica", 212: "Oporto",
};

const POSICION: Record<string, string> = { Goalkeeper: "Portero", Defender: "Defensa", Midfielder: "Centrocampista", Attacker: "Delantero" };

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

/** Fuera los nombres demasiado cortos para un ahorcado («Rodri» sí, «Pau» no). */
const JUGADORES = (datos.jugadores as Jugador[]).filter((j) => nombreDe(j).replace(/[^\p{L}]/gu, "").length >= 4);

function partida(j: Jugador): PartidaAhorcado {
  return {
    id: j.id,
    nombre: nombreDe(j),
    liga: { id: j.liga, nombre: LIGAS_AHORCADO[j.liga] ?? "" },
    equipo: { id: j.eq, nombre: EQUIPOS[j.eq] ?? "" },
    pais: j.p,
    posicion: j.pos ? (POSICION[j.pos] ?? null) : null,
  };
}

/** El jugador del reto del día: el mismo para todos. */
export const ahorcadoDelDia = (numero: number) => partida(delDia(JUGADORES, numero));

/** Uno al azar para practicar (de una liga, si se pide), sin repetir. */
export function ahorcadoPractica(liga: number | undefined, vistos: number[] = [], semilla = Date.now()): PartidaAhorcado | null {
  const pool = JUGADORES.filter((j) => !liga || j.liga === liga);
  if (pool.length === 0) return null;
  const libres = pool.filter((j) => !vistos.includes(j.id));
  const de = libres.length ? libres : pool;
  return partida(de[Math.floor(aleatorio(semilla)() * de.length)]);
}

export const totalAhorcado = () => JUGADORES.length;
