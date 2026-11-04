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
      return;
    }
    fetch("/api/widget/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { token: string | null } | null) => {
        if (d?.token) void plugin.guardar({ token: d.token }).catch(() => {});
      })
      .catch(() => {});
  }, [conSesion]);
  return null;
}
