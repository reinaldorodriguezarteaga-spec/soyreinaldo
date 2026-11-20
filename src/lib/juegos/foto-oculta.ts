import "server-only";
import { delDia } from "./diario";
import { FUTBOLISTAS, TODOS } from "./futbolistas";

/**
 * «Foto oculta» (10-nov-2026): la foto de un jugador de hoy tapada por
 * trozos que se destapan con cada fallo. Solo jugadores con foto de verdad
 * (no la silueta genérica de la API; lo comprueba el script de datos).
 */
export const JUGADORES_FOTO = FUTBOLISTAS.filter((j) => j.foto);

/** Los que se pueden escribir: toda la plantilla. */
export const BUSCABLES_FOTO = TODOS;

export const fotoDelDia = (numero: number) => delDia(JUGADORES_FOTO, numero).id;
