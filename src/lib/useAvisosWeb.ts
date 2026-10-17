"use client";

import { useEffect, useState } from "react";
import { esIOS, estaInstalada } from "@/lib/pwa";

/**
 * Avisos web (Web Push) de este dispositivo: en qué estado están y cómo
 * encenderlos o apagarlos. Lo usan el interruptor del perfil (GoalAlerts) y
 * las ofertas en contexto (OfertaAvisos, 17-oct).
 */
export type EstadoAvisos =
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

export function useAvisosWeb() {
  const [estado, setEstado] = useState<EstadoAvisos>("cargando");
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

  return { estado, trabajando, error, encender, apagar };
}
