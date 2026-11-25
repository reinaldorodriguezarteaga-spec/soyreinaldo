"use client";

import { STORAGE_KEY_CONSENTIMIENTO } from "@/components/CookieConsent";
import { admobNativo } from "@/lib/anuncios-app";

type GoogleFC = { callbackQueue?: unknown[]; showRevocationMessage?: () => void };

/**
 * Vuelve a abrir el aviso de cookies para cambiar la elección. Si el aviso
 * certificado de Google (Privacidad y mensajes de AdSense) está activo, abre el
 * suyo; si no, borra la elección guardada en el nuestro y recarga para que
 * salga otra vez.
 */
export default function CambiarCookies() {
  function abrir() {
    // Dentro de la app (1.3+), las preferencias son las del aviso de Google
    // de AdMob, no las de la web.
    const admob = admobNativo();
    if (admob) {
      void admob.showPrivacyOptionsForm().catch(() => {});
      return;
    }
    // Si elegiste en NUESTRO aviso, se reabre el nuestro. El script de Google
    // está cargado aunque su aviso no se muestre (no lo enseña mientras el
    // sitio no esté aprobado), así que su presencia no basta para usarlo.
    let elegidoEnElNuestro = false;
    try {
      elegidoEnElNuestro = localStorage.getItem(STORAGE_KEY_CONSENTIMIENTO) != null;
    } catch {
      // Sin almacenamiento no hay elección guardada.
    }
    const fc = (window as unknown as { googlefc?: GoogleFC }).googlefc;
    if (!elegidoEnElNuestro && fc?.callbackQueue && typeof fc.showRevocationMessage === "function") {
      fc.callbackQueue.push(fc.showRevocationMessage);
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY_CONSENTIMIENTO);
    } catch {
      // Nada que borrar.
    }
    window.location.reload();
  }

  return (
    <button type="button" className="btn btn--ghost" onClick={abrir}>
      Cambiar mis preferencias de cookies
    </button>
  );
}
