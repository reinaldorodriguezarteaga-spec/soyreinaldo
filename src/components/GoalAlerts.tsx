"use client";

import { useAvisosWeb } from "@/lib/useAvisosWeb";

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

export default function GoalAlerts() {
  const { estado, trabajando, error, encender, apagar } = useAvisosWeb();
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
