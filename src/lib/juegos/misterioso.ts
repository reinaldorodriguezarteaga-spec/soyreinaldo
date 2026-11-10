import "server-only";
import { delDia } from "./diario";
import { FUTBOLISTAS } from "./futbolistas";

/**
 * «Futbolista misterioso» (10-nov-2026): adivinar a un jugador de hoy con
 * pistas que salen de comparar cada intento con él. Los jugadores, de
 * `futbolistas.ts`; solo los que tienen edad (para la pista de la edad).
 */
export const JUGADORES_MISTERIOSO = FUTBOLISTAS.filter((j) => j.edad != null);

export const misteriosoDelDia = (numero: number) => delDia(JUGADORES_MISTERIOSO, numero).id;
