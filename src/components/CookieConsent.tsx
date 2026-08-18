"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";

type Choice = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Empuja un evento al dataLayer de gtag — Google Consent Mode v2 lee de ahí. */
function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

/**
 * Banner de cookies + Google Consent Mode v2. Necesario para servir anuncios
 * (AdSense) a usuarios en la UE/España cumpliendo RGPD/ePrivacy — sin esto,
 * Google no debería personalizar anuncios para esos visitantes.
 *
 * Arranca con TODO denegado por defecto (`ad_storage`/`analytics_storage`/
 * `ad_user_data`/`ad_personalization`) ANTES de que se cargue cualquier
 * script de Google — ver el `<script>` inline en `layout.tsx`, que corre
 * antes que este componente hidrate. Al elegir el usuario, este componente
 * solo actualiza el consentimiento (`gtag('consent','update',...)`) y guarda
 * la elección en localStorage para no volver a preguntar.
 *
 * Sin `NEXT_PUBLIC_ADSENSE_CLIENT_ID` configurado, `layout.tsx` no monta este
 * componente ni carga ningún script de Google — cero cambios de
 * comportamiento hasta que haya Publisher ID real.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  function applyConsent(choice: Choice) {
    gtag("consent", "update", {
      ad_storage: choice,
      ad_user_data: choice,
      ad_personalization: choice,
      analytics_storage: choice,
    });
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Choice | null;
    if (saved === "granted" || saved === "denied") {
      applyConsent(saved);
    } else {
      setVisible(true);
    }
  }, []);

  function choose(choice: Choice) {
    localStorage.setItem(STORAGE_KEY, choice);
    applyConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 80,
        maxWidth: 560,
        margin: "0 auto",
      }}
      className="panel"
    >
      <div style={{ padding: "18px 20px", display: "grid", gap: 14 }}>
        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-dim)" }}>
          Usamos cookies propias y de terceros (anuncios) para mantener la web
          gratis.{" "}
          <Link href="/privacidad" style={{ color: "var(--accent)" }}>
            Más info
          </Link>
          .
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => choose("granted")}
          >
            Aceptar
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => choose("denied")}
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}
