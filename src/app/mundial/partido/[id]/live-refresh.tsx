"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Refresca la página de detalle (server component) mientras el partido está en
 * juego, para que marcador, goles y estadísticas se actualicen casi en vivo.
 * Pausa cuando la pestaña está oculta.
 */
export default function LiveRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
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
