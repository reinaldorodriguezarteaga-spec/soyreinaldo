"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Refresca la página de detalle (server component) mientras el partido está
 * en juego. Idéntico a `mundial/partido/[id]/live-refresh.tsx` (ya era
 * genérico) — copiado a su propio archivo para que /mundial quede intacto.
 * Pausa cuando la pestaña está oculta.
 */
export default function LiveRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
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
