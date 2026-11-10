"use server";

import { top10Practica, type TipoTop10 } from "@/lib/juegos/top10";

const TIPOS: TipoTop10[] = ["minutos", "goles", "asistencias"];

/** Otra lista para practicar (los datos no salen del servidor de golpe). */
export async function otraListaTop10(filtro: { equipo?: number; tipo?: string }, vistas: string[]) {
  const tipo = TIPOS.includes(filtro.tipo as TipoTop10) ? (filtro.tipo as TipoTop10) : undefined;
  const equipo = Number.isInteger(filtro.equipo) ? filtro.equipo : undefined;
  return top10Practica({ equipo, tipo }, Array.isArray(vistas) ? vistas.slice(-200) : []);
}
