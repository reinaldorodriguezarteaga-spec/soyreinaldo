"use client";

import { useEffect, useState } from "react";
import type { Sugerencia } from "./buscar";

/** Lo ya buscado en esta visita: borrar una letra no vuelve a preguntar. */
const memoria = new Map<string, Sugerencia[]>();

/**
 * Sugerencias de /api/juegos/jugadores mientras se escribe (tiki-taka-toe y
 * comparador). Espera poco tras la última tecla y cancela la petición
 * anterior, para que una respuesta vieja no pise a la nueva.
 */
export function useBuscarJugadores(texto: string): { sugerencias: Sugerencia[]; buscando: boolean } {
  const q = texto.trim().toLowerCase();
  const [hecho, setHecho] = useState<{ q: string; r: Sugerencia[] }>({ q: "", r: [] });

  useEffect(() => {
    if (q.length < 3 || memoria.has(q)) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/juegos/jugadores?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<Sugerencia[]>) : []))
        .then((r) => {
          memoria.set(q, r);
          setHecho({ q, r });
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setHecho({ q, r: [] });
        });
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (q.length < 3) return { sugerencias: [], buscando: false };
  const guardado = memoria.get(q) ?? (hecho.q === q ? hecho.r : undefined);
  // Mientras llega lo nuevo, se queda lo último que hubo (no parpadea a vacío).
  return { sugerencias: guardado ?? hecho.r, buscando: guardado === undefined };
}
