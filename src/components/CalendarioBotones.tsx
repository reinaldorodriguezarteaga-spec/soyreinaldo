"use client";

import { useState, useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};
/** Android no tiene app que abra `webcal://` (ni en la app ni en Chrome). */
const esAndroid = () => /Android/i.test(navigator.userAgent);

/**
 * Suscribirse al calendario de "Mis equipos": Google Calendar (vale en todo),
 * webcal:// para iPhone/Mac/Outlook (no en Android) y copiar el enlace para
 * cualquier otra app de calendario.
 */
export default function CalendarioBotones({ token }: { token: string }) {
  const android = useSyncExternalStore(sinSuscripcion, esAndroid, () => false);
  const [copiado, setCopiado] = useState(false);
  const https = `https://www.soyreinaldo.com/api/calendario/${token}.ics`;
  const webcal = https.replace(/^https:/, "webcal:");

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(https);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copia este enlace:", https);
    }
  };

  return (
    <div className="miequipo__chips" style={{ marginTop: 8 }}>
      <a
        className="miequipo__chip"
        href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Google Calendar
      </a>
      {!android && (
        <a className="miequipo__chip" href={webcal}>
          iPhone / Mac / Outlook
        </a>
      )}
      <button type="button" className="miequipo__chip" onClick={copiar}>
        {copiado ? "✓ Enlace copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}
