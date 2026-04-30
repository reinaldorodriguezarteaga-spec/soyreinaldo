"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mientras haya algún partido en juego en la página, refrescamos los datos
 * del server cada `intervalMs`. Pausa cuando la pestaña no está visible
 * para no quemar invocations.
 */
export default function LiveRefresher({
  intervalMs = 30000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    const onVis = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, router]);

  return null;
}
