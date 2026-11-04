"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { GOOGLE_PLAY_URL } from "@/components/Footer";
import { debeReofrecerInstalacion, esAndroid, estaInstalada } from "@/lib/pwa";

const DISMISS_KEY = "install-banner-dismissed";

// Ni el user-agent ni lo que hay en localStorage cambian por fuera de esta
// misma sesión del componente — no hay nada real a lo que suscribirse.
const suscribirNada = () => () => {};

/**
 * Franja para invitar a bajarse la app, solo en Android (4-nov-2026: la app
 * ya está en Google Play). Antes ofrecía instalar la web como PWA con el
 * diálogo de Chrome; ahora lleva a la ficha de Google Play, que trae avisos
 * nativos y widgets. iPhone no la ve: Safari ya anuncia la de la App Store
 * con su franja nativa (meta `apple-itunes-app` del layout).
 *
 * Dentro de la app (y en la web instalada como PWA) no sale.
 */
export default function InstallBanner() {
  // El servidor no conoce el UA ni lo que hay en localStorage: snapshot
  // vacío ahí, useSyncExternalStore evita el desajuste de hidratación en
  // vez de leerlo en un efecto con setState (mismo patrón que CookieConsent).
  const ua = useSyncExternalStore(suscribirNada, () => navigator.userAgent, () => "");
  const dismissedAtRaw = useSyncExternalStore(
    suscribirNada,
    () => localStorage.getItem(DISMISS_KEY),
    () => null,
  );
  // Fijado al montar: leer Date.now() en el render sería impuro.
  const [ahora] = useState(() => Date.now());
  const [cerrado, setCerrado] = useState(false);
  const dismissedAt = dismissedAtRaw ? Number(dismissedAtRaw) : null;

  function cerrar() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setCerrado(true);
  }

  if (cerrado || ua === "" || !esAndroid(ua) || estaInstalada()) return null;
  if (!debeReofrecerInstalacion(dismissedAt, ahora)) return null;

  return (
    <div
      className="panel"
      role="region"
      aria-label="Descargar la app"
      style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}
    >
      <div
        className="wrap"
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0" }}
      >
        <Image
          src="/icon-192.png"
          alt=""
          width={38}
          height={38}
          style={{ borderRadius: 9, flex: "none" }}
        />
        <p
          style={{
            margin: 0,
            fontSize: "0.82rem",
            lineHeight: 1.4,
            flex: 1,
            color: "var(--text-dim)",
          }}
        >
          Descarga la app de <b style={{ color: "var(--text)" }}>Soy Reinaldo</b>: avisos de gol
          al instante y widgets.
        </p>
        <a
          className="btn btn--accent"
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: "none" }}
        >
          Descargar
        </a>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={cerrar}
          style={{
            flex: "none",
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            fontSize: "1.3rem",
            lineHeight: 1,
            cursor: "pointer",
            padding: 4,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
