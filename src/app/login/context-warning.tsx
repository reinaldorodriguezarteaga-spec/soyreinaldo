"use client";

import { useEffect, useState } from "react";

type Ctx = "inapp" | "standalone" | null;

/**
 * Detecta contextos donde el login con Google se rompe en bucle:
 *  - Navegadores in-app (Instagram, WhatsApp, Facebook, TikTok…): el flujo
 *    OAuth pierde las cookies al ir y volver de Google.
 *  - PWA instalada en pantalla de inicio (iOS sobre todo): el OAuth ocurre en
 *    otro contenedor y la sesión no vuelve a la app.
 * En ambos casos avisamos y pedimos abrir la web en el navegador de verdad.
 */
export default function ContextWarning() {
  const [ctx, setCtx] = useState<Ctx>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const inApp =
      /instagram|fbav|fb_iab|fban|whatsapp|tiktok|musical_ly|micromessenger|line\//i.test(
        ua,
      );
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // iOS Safari legacy
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (inApp) setCtx("inapp");
    else if (standalone) setCtx("standalone");
  }, []);

  if (!ctx) return null;

  return (
    <div
      className="notice"
      style={{
        marginBottom: 18,
        borderColor: "color-mix(in oklch, var(--accent-2) 45%, transparent)",
        background: "color-mix(in oklch, var(--accent-2) 12%, transparent)",
      }}
    >
      {ctx === "inapp" ? (
        <>
          <b style={{ color: "var(--accent-2)" }}>
            ⚠️ Estás dentro del navegador de otra app
          </b>
          <p style={{ margin: "6px 0 0", color: "var(--text)", fontSize: "0.88rem", lineHeight: 1.5 }}>
            Iniciar sesión con Google aquí suele fallar y quedarse en bucle.
            Toca el menú <b>⋯</b> (arriba) y elige{" "}
            <b>&ldquo;Abrir en el navegador&rdquo;</b> (Chrome/Safari), o entra
            escribiendo <b>soyreinaldo.com</b> directamente en tu navegador.
          </p>
        </>
      ) : (
        <>
          <b style={{ color: "var(--accent-2)" }}>
            ⚠️ Estás en la app de pantalla de inicio
          </b>
          <p style={{ margin: "6px 0 0", color: "var(--text)", fontSize: "0.88rem", lineHeight: 1.5 }}>
            En este modo el login con Google puede quedarse en bucle. Abre{" "}
            <b>soyreinaldo.com</b> en Safari o Chrome, inicia sesión allí, y
            después vuelve a esta app — la sesión quedará guardada.
          </p>
        </>
      )}
    </div>
  );
}
