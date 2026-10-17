"use client";

import { useState, useSyncExternalStore } from "react";
import { WhatsAppLogo, XLogo } from "@/components/social-logos";

const sinSuscripcion = () => () => {};

/**
 * Botón "Compartir" compacto (fichas de partido y tarjetas, 17-oct): en
 * móvil abre la hoja nativa del sistema (WhatsApp, Instagram, Telegram...);
 * sin ella (escritorio), un menú con WhatsApp, X y copiar enlace.
 */
export default function BotonCompartir({
  url,
  texto,
  etiqueta = "Compartir",
}: {
  /** URL absoluta. */
  url: string;
  texto: string;
  etiqueta?: string;
}) {
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const compartir = async () => {
    if (nativo) {
      try {
        await navigator.share({ title: texto, text: texto, url });
      } catch {
        // Hoja cerrada: no es un error.
      }
      return;
    }
    setAbierto((v) => !v);
  };

  const copiar = () =>
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => {});

  return (
    <span className="compartir">
      <button type="button" className="compartir__btn" onClick={compartir} aria-expanded={nativo ? undefined : abierto}>
        <span aria-hidden>↗</span> {etiqueta}
      </button>
      {abierto && !nativo && (
        <span className="compartir__menu" role="menu">
          <a
            role="menuitem"
            href={`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppLogo className="h-4 w-4" /> WhatsApp
          </a>
          <a
            role="menuitem"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <XLogo className="h-4 w-4" /> X
          </a>
          <button type="button" role="menuitem" onClick={copiar}>
            {copiado ? "✓ Copiado" : "Copiar enlace"}
          </button>
        </span>
      )}
    </span>
  );
}
