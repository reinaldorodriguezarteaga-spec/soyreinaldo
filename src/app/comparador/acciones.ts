"use server";

import { clientePublico } from "@/lib/supabase/publico";
import { JUGADORES } from "@/lib/juegos/carreras";
import { caraDe } from "@/lib/juegos/caras";
import { normalizar } from "@/lib/juegos/diario";

export type Sugerencia = { id: number; nombre: string; foto: string | null };

/** Buscador del comparador: plantillas guardadas (sin cuota) y, por nombre
 * completo, los jugadores de la lista curada (Messi, Cristiano…). */
export async function buscarJugadores(q: string): Promise<Sugerencia[]> {
  const t = (q ?? "").trim().slice(0, 40);
  if (t.length < 3) return [];
  const qn = normalizar(t);
  const curados: Sugerencia[] = JUGADORES.filter((j) => normalizar(j.nombre).includes(qn))
    .map((j) => {
      const foto = caraDe(j.id);
      const id = foto ? Number(foto.match(/players\/(\d+)\.png/)?.[1]) : NaN;
      return Number.isInteger(id) ? { id, nombre: j.nombre, foto } : null;
    })
    .filter((x): x is Sugerencia => !!x);
  const { data } = await clientePublico().rpc("comparador_buscar", { p_q: t, p_limite: 12 });
  const deSquads = ((data ?? []) as { id: number; nombre: string; foto: string | null }[]).map((x) => ({ id: x.id, nombre: x.nombre, foto: x.foto }));
  const vistos = new Set<number>();
  return [...curados, ...deSquads].filter((x) => (vistos.has(x.id) ? false : (vistos.add(x.id), true))).slice(0, 12);
}
