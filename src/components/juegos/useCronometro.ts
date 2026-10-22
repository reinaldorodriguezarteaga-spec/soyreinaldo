"use client";

import { useEffect, useState } from "react";

/**
 * Cuenta atrás de una partida. `inicio` (ms) es cuándo empezó; `fin` (ms),
 * cuándo terminó (congela el reloj). Devuelve los segundos que quedan.
 */
export function useCronometro(segundos: number, inicio: number | null, fin: number | null): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (inicio == null || fin != null) return;
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, [inicio, fin]);
  if (inicio == null) return segundos;
  const hasta = fin ?? ahora;
  return Math.max(0, segundos - Math.floor((hasta - inicio) / 1000));
}
