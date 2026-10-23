import { clientePublico } from "@/lib/supabase/publico";
import { totalesGoats } from "@/lib/goats";
import { getJugadorTemporada, getTemporadasJugador, type EstadisticaJugadorApi } from "@/lib/sports/api-football";
import { nombreVisible } from "@/lib/sports/nombres";
import { nombreCurado } from "@/lib/juegos/caras";
import { competiciones, edadQueCumple, filasDeTemporada, nombreTemporada, sinDuplicados, sumar, type CompeticionJugador, type Totales } from "./datos";

/** Lo que pide cada lado del comparador (va en la URL). */
/** `c`: competiciones elegidas (claves); vacío = todas. */
export type Peticion = { id: number; t: "carrera" | number; c: string[] };

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
  c: string[];
  /** Fecha de nacimiento («1987-06-24»), si el API la da. */
  nacimiento: string | null;
};

/** Solo jugadores de nuestras plantillas guardadas o de la lista curada: así
 * la URL no sirve para gastar cuota con ids al azar. */
export async function permitido(id: number): Promise<boolean> {
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
  // Una temporada pide también la siguiente: sus torneos de verano (el
  // Mundial de ese verano) son de esta.
  const anos = t === "carrera" ? temporadas : [t, ...(temporadas.includes(t + 1) ? [t + 1] : [])];
  const datos: Awaited<ReturnType<typeof getJugadorTemporada>>[] = [];
  // De seis en seis: una carrera larga son ~20 temporadas (cacheadas 30 días).
  for (let i = 0; i < anos.length; i += 6) {
    datos.push(...(await Promise.all(anos.slice(i, i + 6).map((s) => getJugadorTemporada(p.id, s).catch(() => null)))));
  }
  const crudo =
    t === "carrera"
      ? datos.flatMap((d) => d?.statistics ?? [])
      : filasDeTemporada(datos[0]?.statistics ?? [], datos[1]?.statistics ?? []);
  const stats: EstadisticaJugadorApi[] = sinDuplicados(crudo);
  const info = datos.find((d) => d)?.player;
  if (!info) return null;
  const comps = competiciones(stats);
  const c = p.c.filter((k) => comps.some((x) => x.clave === k));
  const comp = c.length ? c.map((k) => comps.find((x) => x.clave === k)!.nombre).join(" + ") : "Todas las competiciones";
  const fecha = datos.find((d) => d?.player.birth?.date)?.player.birth?.date ?? "";
  const nacimiento = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null;
  // Messi y Cristiano, carrera entera y todas las competiciones: las cifras
  // oficiales que mantenemos a mano para Messi vs Cristiano (el API se deja
  // goles y repite filas), para que las dos páginas digan lo mismo.
  let totales = sumar(stats, c);
  let oficial = false;
  if (t === "carrera" && c.length === 0 && (p.id === 154 || p.id === 874)) {
    const g = await totalesGoats(clientePublico()).catch(() => null);
    const o = g ? (p.id === 154 ? g.messi : g.ronaldo) : null;
    if (o) {
      totales = {
        ...totales,
        partidos: o.partidos,
        goles: o.goles,
        asistencias: o.asistencias,
        penMarcados: o.penMarcados,
        penFallados: o.penLanzados - o.penMarcados,
      };
      oficial = true;
    }
  }
  return {
    id: p.id,
    nombre: nombreCurado(p.id) ?? nombreVisible(info.name),
    foto: info.photo ?? `https://media.api-sports.io/football/players/${p.id}.png`,
    temporadas,
    comps,
    totales,
    etiqueta: `${t === "carrera" ? "Toda la carrera" : `${nombreTemporada(t)}${nacimiento ? ` (cumplió ${edadQueCumple(t, nacimiento)})` : ""}`} · ${comp}${oficial ? " (cifras oficiales)" : ""}`,
    nacimiento,
    t,
    c,
  };
}

/** Lee un lado de los parámetros de la URL (a/ta/ca o b/tb/cb). */
export function peticionDe(id?: string, t?: string, c?: string): Peticion | null {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  const ano = Number(t);
  const comps = (c ?? "").split(",").map((x) => x.trim()).filter((x) => x && x.length <= 60).slice(0, 8);
  return { id: n, t: t && Number.isInteger(ano) && ano > 1900 ? ano : "carrera", c: [...new Set(comps)] };
}
