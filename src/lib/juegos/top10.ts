import "server-only";
import datos from "./top10-datos.json";
import { NOMBRES_TOP10 } from "./top10-nombres";
import { aleatorio, delDia } from "./diario";
import { aliasDe, type JugadorTop10, type PartidaTop10, type TipoTop10 } from "./top10-comun";

export type { PartidaTop10, TipoTop10 };

/**
 * «Top 10» (10-nov-2026, pedido del dueño): los 10 jugadores con más minutos,
 * goles o asistencias de un gran equipo europeo en una temporada, con la
 * bandera de cada uno y el nombre oculto. Se escriben nombres contrarreloj.
 *
 * Los datos salen de `scripts/juego-top10.mjs` (API-Football, validados contra
 * los totales del equipo) y viven en `top10-datos.json`: el juego no gasta
 * cuota. Solo servidor: al navegador va una lista cada vez, no el archivo.
 */

type Jugador = JugadorTop10;
type Lista = { id: string; eq: number; liga: number; t: number; tipo: TipoTop10; filas: [number, number][] };

const JUGADORES = datos.jugadores as unknown as Record<string, Jugador>;
const LISTAS = datos.listas as unknown as Lista[];

/** Nombre y artículo de cada equipo («del Barcelona», «de la Juventus»). */
export const EQUIPOS_TOP10: Record<number, { nombre: string; del: string }> = {
  529: { nombre: "Barcelona", del: "del Barcelona" },
  541: { nombre: "Real Madrid", del: "del Real Madrid" },
  530: { nombre: "Atlético de Madrid", del: "del Atlético de Madrid" },
  33: { nombre: "Manchester United", del: "del Manchester United" },
  50: { nombre: "Manchester City", del: "del Manchester City" },
  40: { nombre: "Liverpool", del: "del Liverpool" },
  49: { nombre: "Chelsea", del: "del Chelsea" },
  42: { nombre: "Arsenal", del: "del Arsenal" },
  157: { nombre: "Bayern de Múnich", del: "del Bayern de Múnich" },
  165: { nombre: "Borussia Dortmund", del: "del Borussia Dortmund" },
  496: { nombre: "Juventus", del: "de la Juventus" },
  489: { nombre: "AC Milan", del: "del Milan" },
  505: { nombre: "Inter de Milán", del: "del Inter" },
  85: { nombre: "PSG", del: "del PSG" },
};

const COMPETICION: Record<number, string> = { 140: "LaLiga", 39: "la Premier League", 2: "la Champions" };
const TITULO_TIPO: Record<TipoTop10, string> = {
  minutos: "Más minutos",
  goles: "Más goles",
  asistencias: "Más asistencias",
};

const temporada = (t: number) => `${t}-${String((t + 1) % 100).padStart(2, "0")}`;

/** «L. Messi» → «Lionel Messi»: con la inicial del nombre se lee peor. */
function nombreVisible(j: Jugador): string {
  const m = j.n.match(/^(\p{L})\.\s*(.+)$/u);
  const pila = j.f?.split(" ")[0];
  return m && pila && pila.startsWith(m[1]) ? `${pila} ${m[2]}` : j.n;
}

function partida(l: Lista): PartidaTop10 {
  const eq = EQUIPOS_TOP10[l.eq];
  return {
    id: l.id,
    titulo: `${TITULO_TIPO[l.tipo]} ${eq.del}`,
    subtitulo: `${COMPETICION[l.liga]} ${temporada(l.t)}`,
    equipoId: l.eq,
    tipo: l.tipo,
    filas: l.filas.map(([id, valor], i) => {
      const j = JUGADORES[String(id)];
      const extra = NOMBRES_TOP10[id] ?? {};
      return {
        pos: i + 1,
        valor,
        bandera: j?.b ?? null,
        pais: j?.p ?? null,
        nombre: extra.nombre ?? (j ? nombreVisible(j) : "?"),
        alias: j ? aliasDe(j, extra) : [],
      };
    }),
  };
}

/** La lista del reto del día: la misma para todos. */
export function top10DelDia(numero: number): PartidaTop10 {
  return partida(delDia(LISTAS, numero));
}

export type FiltroTop10 = { equipo?: number; tipo?: TipoTop10 };

/** Una lista al azar para practicar, con filtros y sin repetir las ya vistas. */
export function top10Practica(filtro: FiltroTop10, vistas: string[] = [], semilla = Date.now()): PartidaTop10 | null {
  const pool = LISTAS.filter((l) => (!filtro.equipo || l.eq === filtro.equipo) && (!filtro.tipo || l.tipo === filtro.tipo));
  if (pool.length === 0) return null;
  const libres = pool.filter((l) => !vistas.includes(l.id));
  const de = libres.length ? libres : pool;
  return partida(de[Math.floor(aleatorio(semilla)() * de.length)]);
}

/** Equipos con alguna lista, para el filtro de la práctica. */
export const equiposConListas = () =>
  [...new Set(LISTAS.map((l) => l.eq))].map((id) => ({ id, nombre: EQUIPOS_TOP10[id]?.nombre ?? String(id) }));

export const totalListas = () => LISTAS.length;

/** «2006-07» y «2024-25»: la primera y la última temporada con listas. */
export const temporadasTop10 = () => {
  const ts = LISTAS.map((l) => l.t);
  return { desde: temporada(Math.min(...ts)), hasta: temporada(Math.max(...ts)) };
};
