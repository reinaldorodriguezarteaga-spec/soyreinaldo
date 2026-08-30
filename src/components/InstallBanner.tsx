"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  debeReofrecerInstalacion,
  esAndroid,
  esIOS,
  esMovil,
  estaInstalada,
} from "@/lib/pwa";

const DISMISS_KEY = "install-banner-dismissed";

/** Chrome no tipa este evento en `lib.dom` — solo lo dispara Chromium/Edge
 * en Android (y desktop, que aquí se descarta a propósito). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Ni el user-agent ni lo que hay en localStorage cambian por fuera de esta
// misma sesión del componente — no hay nada real a lo que suscribirse.
const suscribirNada = () => () => {};

/**
 * Franja para invitar a instalar la web como app, solo en móvil. El motivo
 * real no es la comodidad del icono en pantalla: en iOS las notificaciones
 * push de `GoalAlerts` SOLO funcionan con la web instalada, y en cualquier
 * plataforma tener la app puesta sube mucho cuántos llegan a activarlas.
 *
 * Android: espera al `beforeinstallprompt` de Chrome y ofrece su diálogo
 * nativo — sin botón "Instalar" que no haga nada si el navegador no lo
 * dispara (Firefox, o Chrome antes de decidir que la web es instalable).
 * Ese evento exige un service worker YA registrado; `GoalAlerts` solo lo
 * registra al activar avisos, así que aquí se registra de antemano — sin
 * pedir permiso de notificación, eso sigue siendo decisión aparte.
 *
 * iOS no tiene ese evento (limitación de Safari): se explica el paso manual,
 * igual que ya hacía `GoalAlerts` para quien llega sin la app instalada.
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

  // Fijado en el inicializador perezoso de useState —corre una sola vez al
  // montar—, no leído con Date.now() directo en el cuerpo del render: eso sí
  // sería impuro (mismo patrón que la página del equipo con "ahora").
  const [ahora] = useState(() => Date.now());
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [instalando, setInstalando] = useState(false);

  const movil = ua !== "" && esMovil(ua);
  const dismissedAt = dismissedAtRaw ? Number(dismissedAtRaw) : null;

  // Registrar el SW y escuchar los eventos del navegador es sincronizar con
  // un sistema externo de verdad — a diferencia de leer el UA o
  // localStorage, esto sí es trabajo de efecto. El setState vive dentro de
  // los callbacks de los listeners, nunca en el cuerpo del efecto.
  useEffect(() => {
    if (!movil || estaInstalada()) return;
    if (!debeReofrecerInstalacion(dismissedAt, ahora)) return;

    if (esAndroid(ua) && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker no hay beforeinstallprompt; la franja
        // simplemente no aparece (ver el early-return de más abajo).
      });
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setCerrado(true);
      localStorage.removeItem(DISMISS_KEY);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [movil, ua, dismissedAt, ahora]);

  function cerrar() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setCerrado(true);
  }

  async function instalar() {
    if (!prompt) return;
    setInstalando(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome !== "accepted") cerrar();
    } finally {
      setPrompt(null);
      setInstalando(false);
    }
  }

  if (cerrado || !movil || estaInstalada()) return null;
  if (!debeReofrecerInstalacion(dismissedAt, ahora)) return null;
  // Android sin el prompt todavía disponible: mejor nada que un botón
  // "Instalar" que no reacciona.
  if (esAndroid(ua) && !prompt) return null;

  const ios = esIOS(ua);

  return (
    <div
      className="panel"
      role="region"
      aria-label="Instalar la app"
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
          {ios ? (
            <>
              Añade <b style={{ color: "var(--text)" }}>Soy Reinaldo</b> a tu
              pantalla de inicio: toca <b>Compartir</b> y luego{" "}
              <b>Añadir a pantalla de inicio</b>.
            </>
          ) : (
            <>
              Instala <b style={{ color: "var(--text)" }}>Soy Reinaldo</b> como
              app y recibe avisos de gol al instante.
            </>
          )}
        </p>
        {!ios && (
          <button
            type="button"
            className="btn btn--accent"
            onClick={instalar}
            disabled={instalando}
            style={{ flex: "none" }}
          >
            {instalando ? "…" : "Instalar"}
          </button>
        )}
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
