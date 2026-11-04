"use client";

import { useEffect } from "react";

/**
 * Dentro de la app (1.1), le pasa al iPhone la llave del widget
 * «Clasificación» (migración 108) para que el widget pida el puesto de quien
 * tiene la sesión; sin sesión, la borra. Usa el plugin propio de la app
 * (`WidgetPuente`, MainViewController.swift) vía `window.Capacitor`: en el
 * navegador y en la app 1.0 no hace nada. No pinta nada.
 */
type PluginWidget = {
  guardar(o: { token: string }): Promise<void>;
  borrar(): Promise<void>;
  /** App 1.2+: token de arranque de las actividades en directo (push-to-start). */
  tokenInicio?: () => Promise<{ token: string | null }>;
};
type CapacitorGlobal = { isPluginAvailable?: (n: string) => boolean; Plugins?: Record<string, unknown> };

export default function PuenteWidget({ conSesion }: { conSesion: boolean }) {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!cap?.isPluginAvailable?.("WidgetPuente")) return;
    const plugin = cap.Plugins?.WidgetPuente as PluginWidget | undefined;
    if (!plugin) return;
    if (!conSesion) {
      void plugin.borrar().catch(() => {});
      // Si entra otra cuenta en este iPhone, el token se vuelve a mandar.
      try {
        localStorage.removeItem("la-token-inicio");
      } catch {}
      return;
    }
    fetch("/api/widget/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { token: string | null } | null) => {
        if (d?.token) void plugin.guardar({ token: d.token }).catch(() => {});
      })
      .catch(() => {});
    // Actividades en directo (migración 112): con el token de arranque, el
    // servidor enciende el marcador en la pantalla de bloqueo al empezar un
    // partido de un equipo favorito. Se manda solo si ha cambiado.
    void plugin
      .tokenInicio?.()
      .then(({ token }) => {
        if (!token) return;
        let enviado: string | null = null;
        try {
          enviado = localStorage.getItem("la-token-inicio");
        } catch {}
        if (enviado === token) return;
        return fetch("/api/actividad/token-inicio", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        }).then((r) => {
          if (!r.ok) return;
          try {
            localStorage.setItem("la-token-inicio", token);
          } catch {}
        });
      })
      .catch(() => {});
  }, [conSesion]);
  return null;
}
