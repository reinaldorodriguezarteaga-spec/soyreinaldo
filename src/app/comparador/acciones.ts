"use server";

import { buscarJugadores as buscar, type Sugerencia } from "@/lib/juegos/buscar";

export type { Sugerencia };

/** Buscador del comparador (lib/juegos/buscar.ts, compartido con el tiki-taka). */
export async function buscarJugadores(q: string): Promise<Sugerencia[]> {
  return buscar(q);
}
