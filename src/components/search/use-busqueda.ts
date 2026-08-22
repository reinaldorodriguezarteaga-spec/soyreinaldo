"use client";

import { useEffect, useState } from "react";
import type { BusquedaUniversal } from "@/app/api/sports/search/route";

export const SIN_RESULTADOS: BusquedaUniversal = { equipos: [], jugadores: [] };

/** Letras mínimas: las que exige API-Football en sus endpoints de búsqueda. */
export const MINIMO_LETRAS = 3;

/**
 * Búsqueda universal con debounce, compartida por la barra del header y la
 * página /buscar.
 *
 * Los resultados guardan de QUÉ término son: así, mientras se teclea, no se
 * enseñan los de la búsqueda anterior, y el efecto no necesita limpiarlos con
 * un setState síncrono (que provoca renders en cascada).
 */
export function useBusqueda(q: string) {
  const term = q.trim();
  const [hecho, setHecho] = useState<{ term: string; data: BusquedaUniversal } | null>(
    null,
  );

  useEffect(() => {
    if (term.length < MINIMO_LETRAS) return;
    let cancelado = false;
    const id = setTimeout(() => {
      fetch(`/api/sports/search?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : SIN_RESULTADOS))
        .then((d: BusquedaUniversal) => {
          if (!cancelado) setHecho({ term, data: d?.equipos ? d : SIN_RESULTADOS });
        })
        .catch(() => {
          if (!cancelado) setHecho({ term, data: SIN_RESULTADOS });
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(id);
    };
  }, [term]);

  const res = hecho?.term === term ? hecho.data : SIN_RESULTADOS;
  const cargando = term.length >= MINIMO_LETRAS && hecho?.term !== term;
  const vacio =
    term.length >= MINIMO_LETRAS &&
    !cargando &&
    res.equipos.length === 0 &&
    res.jugadores.length === 0;

  return { term, res, cargando, vacio };
}
