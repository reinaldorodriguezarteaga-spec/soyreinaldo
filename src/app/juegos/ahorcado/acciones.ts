"use server";

import { LIGAS_AHORCADO, ahorcadoPractica } from "@/lib/juegos/ahorcado";

/** Otro jugador para practicar (los datos no salen del servidor de golpe). */
export async function otroAhorcado(liga: number | null, vistos: number[]) {
  const l = liga && liga in LIGAS_AHORCADO ? liga : undefined;
  return ahorcadoPractica(l, Array.isArray(vistos) ? vistos.filter(Number.isInteger).slice(-300) : []);
}
