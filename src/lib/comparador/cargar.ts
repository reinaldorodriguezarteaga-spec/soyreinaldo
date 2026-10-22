import { clientePublico } from "@/lib/supabase/publico";
import { getJugadorTemporada, getTemporadasJugador, type EstadisticaJugadorApi } from "@/lib/sports/api-football";
import { nombreVisible } from "@/lib/sports/nombres";
import { nombreCurado } from "@/lib/juegos/caras";
import { competiciones, nombreTemporada, sumar, type CompeticionJugador, type Totales } from "./datos";

/** Lo que pide cada lado del comparador (va en la URL). */
export type Peticion = { id: number; t: "carrera" | number; c: string | null };

export type Lado = {
  id: number;
  nombre: string;
  foto: string;
  temporadas: number[];
  comps: CompeticionJugador[];
  totales: Totales;
  /** «2014-15 · Champions League» */
  etiqueta: string;
  t: "carrera" | number;
  c: string | null;
};

/** Solo jugadores de nuestras plantillas guardadas o de la lista curada: así
 * la URL no sirve para gastar cuota con ids al azar. */
async function permitido(id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) return false;
  if (nombreCurado(id)) return true;
  const { data } = await clientePublico().rpc("comparador_existe", { p_id: id });
  return data === true;
}

export async function cargarLado(p: Peticion): Promise<Lado | null> {
  if (!(await permitido(p.id))) return null;
  const temporadas = await getTemporadasJugador(p.id).catch(() => [] as number[]);
  if (temporadas.length === 0) return null;
  const t = p.t === "carrera" || temporadas.includes(p.t) ? p.t : temporadas[0];
  const anos = t === "carrera" ? temporadas : [t];
  const datos: Awaited<ReturnType<typeof getJugadorTemporada>>[] = [];
  // De seis en seis: una carrera larga son ~20 temporadas (cacheadas 30 días).
  for (let i = 0; i < anos.length; i += 6) {
    datos.push(...(await Promise.all(anos.slice(i, i + 6).map((s) => getJugadorTemporada(p.id, s).catch(() => null)))));
  }
  const stats: EstadisticaJugadorApi[] = datos.flatMap((d) => d?.statistics ?? []);
  const info = datos.find((d) => d)?.player;
  if (!info) return null;
  const comps = competiciones(stats);
  const c = p.c && comps.some((x) => x.clave === p.c) ? p.c : null;
  const comp = c ? comps.find((x) => x.clave === c)!.nombre : "Todas las competiciones";
  return {
    id: p.id,
    nombre: nombreCurado(p.id) ?? nombreVisible(info.name),
    foto: info.photo ?? `https://media.api-sports.io/football/players/${p.id}.png`,
    temporadas,
    comps,
    totales: sumar(stats, c),
    etiqueta: `${t === "carrera" ? "Toda la carrera" : nombreTemporada(t)} · ${comp}`,
    t,
    c,
  };
}

/** Lee un lado de los parámetros de la URL (a/ta/ca o b/tb/cb). */
export function peticionDe(id?: string, t?: string, c?: string): Peticion | null {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  const ano = Number(t);
  return { id: n, t: t && Number.isInteger(ano) && ano > 1900 ? ano : "carrera", c: c && c.length <= 60 ? c : null };
}
