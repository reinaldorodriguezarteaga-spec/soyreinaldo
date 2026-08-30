"use client";

import { useEffect, useState } from "react";
import { esIOS, estaInstalada } from "@/lib/pwa";

/**
 * Interruptor de los avisos de gol.
 *
 * Avisa cuando marca un equipo que tengas en favoritos. Es lo que da motivo a
 * volver: los datos están en veinte sitios, el aviso en el momento no.
 *
 * En iPhone las notificaciones web solo funcionan si la página está añadida a
 * la pantalla de inicio — limitación de Apple, no nuestra — así que ahí se
 * explica el paso en vez de ofrecer un botón que no haría nada. El banner de
 * instalación (`InstallBanner`) ofrece ese mismo paso antes de llegar aquí.
 */

type Estado =
  | "cargando"
  | "no-soportado"
  | "ios-sin-instalar"
  | "bloqueado"
  | "apagado"
  | "encendido";

/** La clave pública viene en base64url y `subscribe` la quiere en bytes.
 * Devuelve ArrayBuffer y no Uint8Array porque el tipado de `applicationServerKey`
 * no acepta el segundo con el `lib` de TypeScript que usa el proyecto. */
function base64ABytes(base64: string): ArrayBuffer {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = window.atob(normal);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes.buffer;
}

export default function GoalAlerts() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado(esIOS(navigator.userAgent) && !estaInstalada() ? "ios-sin-instalar" : "no-soportado");
        return;
      }
      if (esIOS(navigator.userAgent) && !estaInstalada()) {
        setEstado("ios-sin-instalar");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setEstado(sub ? "encendido" : "apagado");
    })().catch(() => setEstado("no-soportado"));
  }, []);

  async function encender() {
    setTrabajando(true);
    setError(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const res = await fetch("/api/push/public-key");
      if (!res.ok) throw new Error("El servidor no tiene claves configuradas.");
      const { key } = (await res.json()) as { key: string };

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ABytes(key),
      });

      const alta = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!alta.ok) throw new Error("No se pudo guardar la suscripción.");
      setEstado("encendido");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar.");
    } finally {
      setTrabajando(false);
    }
  }

  async function apagar() {
    setTrabajando(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEstado("apagado");
    } catch {
      setError("No se pudo desactivar.");
    } finally {
      setTrabajando(false);
    }
  }

  if (estado === "cargando") return null;

  return (
    <div className="panel" style={{ padding: 20, marginTop: 20 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: "1.15rem" }}>⚽ Avisos de gol</h2>
      <p style={{ color: "var(--text-dim)", margin: "0 0 16px", fontSize: "0.92rem" }}>
        Te avisamos en cuanto marca un equipo que tengas en favoritos. Nada más:
        ni resúmenes, ni promociones.
      </p>

      {estado === "ios-sin-instalar" && (
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          En iPhone hace falta añadir la web a la pantalla de inicio antes de
          poder activarlos. Toca <strong>Compartir</strong> abajo y luego{" "}
          <strong>Añadir a pantalla de inicio</strong>. Después vuelve aquí.
        </p>
      )}

      {estado === "no-soportado" && (
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-dim)" }}>
          Este navegador no admite notificaciones.
        </p>
      )}

      {estado === "bloqueado" && (
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          Tienes las notificaciones bloqueadas para esta web. Se cambia desde los
          ajustes del navegador, en el candado junto a la dirección.
        </p>
      )}

      {estado === "apagado" && (
        <button
          type="button"
          className="btn btn--accent"
          onClick={encender}
          disabled={trabajando}
        >
          {trabajando ? "Activando…" : "Activar avisos"}
        </button>
      )}

      {estado === "encendido" && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "var(--accent)", fontSize: "0.92rem" }}>
            ✓ Activados en este dispositivo
          </span>
          <button type="button" className="btn" onClick={apagar} disabled={trabajando}>
            {trabajando ? "Desactivando…" : "Desactivar"}
          </button>
        </div>
      )}

      {error && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: "0.88rem", color: "var(--danger, #ff6b6b)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
