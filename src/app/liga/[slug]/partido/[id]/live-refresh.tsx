"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Refresca la página de detalle (server component) mientras el partido está
 * en juego. Idéntico a `mundial/partido/[id]/live-refresh.tsx` (ya era
 * genérico) — copiado a su propio archivo para que /mundial quede intacto.
 * Pausa cuando la pestaña está oculta.
 *
 * 60s por defecto (no 15s): cada tick es un `router.refresh()` — un
 * RE-RENDER COMPLETO del server component por cada visitante que tenga la
 * pestaña abierta, no una llamada ligera a una API cacheada. Con varios
 * partidos en juego a la vez (9 competiciones, ya no 1 como en el Mundial)
 * y gente viendo cada uno, 15s multiplicaba el coste de CPU justo el mismo
 * cuello de botella que ya obligó a subir el resto del polling de 30s a
 * 60-90s en el incidente de CPU de Vercel documentado en memoria — aquí se
 * había quedado en 15s desde la reescritura multi-liga, sin aplicar esa
 * misma lección.
 */
export default function LiveRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);
  return null;
}
