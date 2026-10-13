"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Suscripción al directo en tiempo real (Supabase Realtime sobre la tabla
 * `partidos_directo`, migración 061). Llama a `alCambiar` cada vez que el
 * cron guarda un cambio (gol, minuto, tarjeta…): de un partido concreto si
 * se pasa `fixtureId`, de cualquiera si no. Los avisos seguidos se agrupan
 * (`esperaMs`) para no recargar varias veces por lo mismo.
 *
 * `activo: false` no abre conexión (pestañas sin partidos en juego).
 *
 * Devuelve si la suscripción está viva: quien la usa mantiene su sondeo de
 * siempre como respaldo y lo espacia mientras el tiempo real funcione.
 */
export function useDirecto(
  alCambiar: () => void,
  {
    fixtureId,
    esperaMs = 700,
    activo = true,
  }: { fixtureId?: number; esperaMs?: number; activo?: boolean } = {},
): boolean {
  const [conectado, setConectado] = useState(false);
  const cb = useRef(alCambiar);
  useEffect(() => {
    cb.current = alCambiar;
  }, [alCambiar]);

  useEffect(() => {
    // Sin nada en juego, ni se conecta: Supabase Pro admite 500 conexiones
    // simultáneas y no hay que gastarlas en pestañas sin partidos.
    if (!activo) return;
    const sb = createClient();
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    const avisar = () => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        if (!document.hidden) cb.current();
      }, esperaMs);
    };
    const canal = sb
      .channel(`directo-${fixtureId ?? "todos"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partidos_directo",
          ...(fixtureId ? { filter: `fixture_id=eq.${fixtureId}` } : {}),
        },
        avisar,
      )
      .subscribe((estado) => setConectado(estado === "SUBSCRIBED"));
    return () => {
      if (temporizador) clearTimeout(temporizador);
      void sb.removeChannel(canal);
      setConectado(false);
    };
  }, [fixtureId, esperaMs, activo]);

  return activo && conectado;
}
