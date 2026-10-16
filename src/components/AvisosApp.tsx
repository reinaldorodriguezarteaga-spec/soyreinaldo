"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pushNativo, registrarDispositivo } from "@/lib/push/app-nativa";
import { T } from "@/components/EnApp";

// "cargando" también cubre "sin plugin" (navegador o app 1.0): no se pinta.
type Estado = "cargando" | "apagado" | "encendido" | "bloqueado";

/**
 * "Avisos de gol" dentro de la app (1.1): la versión nativa de GoalAlerts,
 * que es Web Push y en la app no funciona. Pide el permiso de iOS, registra
 * el iPhone en APNs y guarda el token. Los avisos salen por los mismos
 * favoritos que en la web (lib/push/server.ts).
 *
 * En la app 1.0 (sin el plugin) y en el navegador no pinta nada.
 */
export default function AvisosApp({ tieneFavoritos }: { tieneFavoritos: boolean }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const plugin = pushNativo();
    if (!plugin) return;
    plugin
      .checkPermissions()
      .then(({ receive }) =>
        setEstado(receive === "granted" ? "encendido" : receive === "denied" ? "bloqueado" : "apagado"),
      )
      .catch(() => setEstado("apagado"));
  }, []);

  async function activar() {
    const plugin = pushNativo();
    if (!plugin) return;
    setTrabajando(true);
    setError(null);
    try {
      const { receive } = await plugin.requestPermissions();
      if (receive !== "granted") {
        setEstado("bloqueado");
        return;
      }
      const token = await registrarDispositivo(plugin);
      if (!token) {
        setError("No se pudo activar. Prueba otra vez en un momento.");
        return;
      }
      setEstado("encendido");
    } catch {
      setError("No se pudo activar.");
    } finally {
      setTrabajando(false);
    }
  }

  if (estado === "cargando") return null;

  return (
    <div className="panel" style={{ padding: 20, marginTop: 20 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: "1.15rem" }}>⚽ Avisos de gol</h2>
      <p style={{ color: "var(--text-dim)", margin: "0 0 16px", fontSize: "0.92rem" }}>
        <T>
          Te avisamos en cuanto marca un equipo que tengas en favoritos, y te
          recordamos los pronósticos de la quiniela antes de cada jornada.
        </T>
      </p>

      {!tieneFavoritos && (
        <p style={{ margin: "0 0 14px", fontSize: "0.9rem" }}>
          Aún no tienes equipos favoritos: márcalos con la ⭐ en la ficha de
          cualquier equipo o en <Link href="/liga/laliga">LaLiga</Link>.
        </p>
      )}

      {estado === "apagado" && (
        <button type="button" className="btn btn--accent" onClick={activar} disabled={trabajando}>
          {trabajando ? "Activando…" : "Activar avisos"}
        </button>
      )}

      {estado === "encendido" && (
        <span style={{ color: "var(--accent)", fontSize: "0.92rem" }}>
          ✓ Activados en este iPhone. Se desactivan en Ajustes › Notificaciones › Soy Reinaldo.
        </span>
      )}

      {estado === "bloqueado" && (
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          Las notificaciones de la app están desactivadas. Se activan en{" "}
          <strong>Ajustes › Notificaciones › Soy Reinaldo</strong>.
        </p>
      )}

      {error && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: "0.88rem", color: "var(--danger, #ff6b6b)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
