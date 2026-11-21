"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

export const STORAGE_KEY_CONSENTIMIENTO = "cookie-consent";
const STORAGE_KEY = STORAGE_KEY_CONSENTIMIENTO;

type Choice = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __tcfapi?: (
      cmd: string,
      version: number,
      cb: (data: { eventStatus?: string } | null, ok: boolean) => void,
    ) => void;
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
  // Lo que hay guardado se LEE del almacenamiento (useSyncExternalStore
  // devuelve null en el servidor, sin desajuste de hidratación); lo que el
  // usuario acaba de elegir vive en estado. El banner sale si no hay ni una
  // cosa ni la otra. Antes esto era un setState dentro de un efecto.
  const guardado = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(STORAGE_KEY),
    () => null,
  );
  const [recienElegido, setRecienElegido] = useState<Choice | null>(null);
  // El aviso certificado de Google (AdSense → Privacidad y mensajes, activado
  // por el dueño) manda cuando se muestra: entonces este se aparta para que no
  // salgan dos. Hasta que Google lo enseñe (no lo hace mientras el sitio no
  // esté aprobado), este sigue siendo el aviso de reserva.
  const [manejaGoogle, setManejaGoogle] = useState(false);
  const visible = !guardado && !recienElegido && !manejaGoogle;

  useEffect(() => {
    let vivo = true;
    let intentos = 0;
    // __tcfapi lo define el script de Google al cargar, que va con async:
    // se espera hasta ~6 s y luego se deja de mirar.
    const id = window.setInterval(() => {
      intentos += 1;
      if (typeof window.__tcfapi === "function") {
        window.clearInterval(id);
        window.__tcfapi("addEventListener", 2, (data, ok) => {
          if (!vivo || !ok || !data) return;
          // cmpuishown: Google enseña su aviso. tcloaded: ya elegiste en él.
          if (data.eventStatus === "cmpuishown" || data.eventStatus === "tcloaded") {
            setManejaGoogle(true);
          }
        });
      } else if (intentos >= 30) {
        window.clearInterval(id);
      }
    }, 200);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, []);

  function applyConsent(choice: Choice) {
    gtag("consent", "update", {
      ad_storage: choice,
      ad_user_data: choice,
      ad_personalization: choice,
      analytics_storage: choice,
    });
  }

  // Aplicar la decisión ya guardada a Google Consent Mode: efecto de verdad
  // (habla con un script externo), sin tocar estado.
  useEffect(() => {
    if (guardado === "granted" || guardado === "denied") applyConsent(guardado);
  }, [guardado]);

  function choose(choice: Choice) {
    localStorage.setItem(STORAGE_KEY, choice);
    applyConsent(choice);
    setRecienElegido(choice);
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
        bottom: "calc(16px + var(--tabbar-alto, 0px))",
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
          <Link href="/cookies" style={{ color: "var(--accent)" }}>
            Política de cookies
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
