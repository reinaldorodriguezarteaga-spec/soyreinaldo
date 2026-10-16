"use client";

import { useSyncExternalStore } from "react";

/**
 * Interruptor "Solo favoritos" de la portada (16-oct, pedido del dueño):
 * lo comparten la tarjeta En vivo/Hoy y el calendario, y se recuerda en este
 * navegador. Es una preferencia de vista, no un dato de la cuenta.
 */
const CLAVE = "soloFavoritos";
const EVENTO = "solo-favoritos";

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSoloFavoritos(): [boolean, (v: boolean) => void] {
  const valor = useSyncExternalStore(suscribir, leer, () => false);
  const cambiar = (v: boolean) => {
    try {
      localStorage.setItem(CLAVE, v ? "1" : "0");
    } catch {
      // sin almacenamiento: dura lo que la página
    }
    window.dispatchEvent(new Event(EVENTO));
  };
  return [valor, cambiar];
}

/** Lo que el usuario sigue: equipos (id de API-Football) y ligas (slug). */
export type Seguidos = { equipos: number[]; ligas: string[] };

export function esDeFavoritos(
  seguidos: Seguidos,
  homeId: number,
  awayId: number,
  ligaSlug: string | null | undefined,
): boolean {
  return (
    seguidos.equipos.includes(homeId) ||
    seguidos.equipos.includes(awayId) ||
    (!!ligaSlug && seguidos.ligas.includes(ligaSlug))
  );
}
