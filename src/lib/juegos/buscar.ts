import { clientePublico } from "@/lib/supabase/publico";
import { JUGADORES } from "./carreras";
import { caraDe } from "./caras";
import { normalizar } from "./diario";

/**
 * Buscador de jugadores para el comparador y el tiki-taka-toe (23-oct): los
 * de la lista curada por nombre completo y los de todas las plantillas
 * guardadas (~10.000, sin gastar cuota). En las plantillas el nombre viene
 * abreviado («E. Fernández»): se busca por el apellido y se comprueba la
 * inicial («enzo fernandez» → E. Fernández).
 */
export type Sugerencia = { id: number; nombre: string; foto: string | null; equipo: number | null };

const idDeFoto = (foto: string | null) => Number(foto?.match(/players\/(\d+)\.png/)?.[1]);

export async function buscarJugadores(q: string, limite = 12): Promise<Sugerencia[]> {
  const t = (q ?? "").trim().slice(0, 40);
  if (t.length < 3) return [];
  const qn = normalizar(t);
  const palabras = qn.split(/\s+/).filter(Boolean);
  const apellido = [...palabras].sort((a, b) => b.length - a.length)[0];

  const curados: Sugerencia[] = JUGADORES.filter((j) => palabras.every((p) => normalizar(j.nombre).includes(p)))
    .map((j): Sugerencia | null => {
      const foto = caraDe(j.id);
      const id = idDeFoto(foto);
      return Number.isInteger(id) ? { id, nombre: j.nombre, foto, equipo: null } : null;
    })
    .filter((x): x is Sugerencia => !!x);

  const { data } = await clientePublico().rpc("comparador_buscar", { p_q: apellido, p_limite: 40 });
  const filas = (data ?? []) as { id: number; nombre: string; foto: string | null; equipo: number | null }[];
  // Cada palabra de la búsqueda tiene que estar en el nombre o ser la
  // inicial de alguna parte abreviada («E.»).
  const encaja = (nombre: string) => {
    const n = normalizar(nombre);
    const iniciales = n.split(/\s+/).filter((x) => /^[a-z]\.$/.test(x)).map((x) => x[0]);
    return palabras.every((p) => n.includes(p) || iniciales.includes(p[0]));
  };
  const deSquads = filas.filter((f) => encaja(f.nombre)).map((f) => ({ id: f.id, nombre: f.nombre, foto: f.foto, equipo: f.equipo }));
  const vistos = new Set<number>();
  return [...curados, ...deSquads].filter((x) => (vistos.has(x.id) ? false : (vistos.add(x.id), true))).slice(0, limite);
}
