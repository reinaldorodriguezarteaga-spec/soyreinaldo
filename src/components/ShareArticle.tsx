"use client";

import { useState } from "react";
import {
  FacebookLogo,
  InstagramLogo,
  ThreadsLogo,
  WhatsAppLogo,
  XLogo,
} from "@/components/social-logos";

/**
 * Bloque "Compártelo" del final de cada análisis. El botón principal abre la
 * hoja de compartir NATIVA del sistema (Web Share API); en navegadores sin
 * la API (p. ej. Firefox de escritorio) cae a copiar el enlace.
 *
 * Instagram es caso aparte: NO tiene intent web (no existe URL tipo wa.me
 * que abra Instagram con el enlace puesto), así que su botón abre la hoja
 * nativa en móvil — ahí Instagram sí aparece (Stories/DM) — y en escritorio
 * copia el enlace avisando de pegarlo en historia/DM. El resto son intents
 * web directos que no dependen de nada.
 */
export default function ShareArticle({
  title,
  url,
}: {
  title: string;
  /** URL absoluta del artículo (los intents y la hoja nativa la necesitan
   * completa, no relativa). */
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  const [avisoIg, setAvisoIg] = useState(false);

  const texto = `${title} — ${url}`;
  const redes = [
    {
      nombre: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(texto)}`,
      icono: <WhatsAppLogo className="h-4 w-4" />,
    },
    {
      nombre: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      icono: <XLogo className="h-4 w-4" />,
    },
    {
      nombre: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icono: <FacebookLogo className="h-4 w-4" />,
    },
    {
      nombre: "Threads",
      href: `https://www.threads.net/intent/post?text=${encodeURIComponent(texto)}`,
      icono: <ThreadsLogo className="h-4 w-4" />,
    },
  ];

  function copiar() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  async function compartirNativo() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // El usuario cerró la hoja de compartir: no es un error.
      }
    } else {
      copiar();
    }
  }

  async function compartirInstagram() {
    if (typeof navigator !== "undefined" && navigator.share) {
      // Móvil (y escritorios con Web Share): en la hoja nativa Instagram
      // sí aparece como destino.
      try {
        await navigator.share({ title, url });
      } catch {
        // Hoja cerrada por el usuario.
      }
    } else {
      // Sin hoja nativa no hay forma de abrir Instagram con el enlace:
      // copiamos y avisamos de pegarlo en historia/DM.
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setAvisoIg(true);
          setTimeout(() => setAvisoIg(false), 4000);
        })
        .catch(() => {});
    }
  }

  return (
    <div className="panel" style={{ marginTop: 36, padding: "22px 24px" }}>
      <p
        className="mono"
        style={{
          fontSize: "0.64rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: 14,
        }}
      >
        ¿Te ha gustado? Compártelo
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="btn btn--accent" onClick={compartirNativo}>
          Compartir <span className="arr">→</span>
        </button>
        <button type="button" className="btn btn--ghost" onClick={compartirInstagram}>
          <InstagramLogo className="h-4 w-4" />
          Instagram
        </button>
        {redes.map((red) => (
          <a
            key={red.nombre}
            href={red.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost"
          >
            {red.icono}
            {red.nombre}
          </a>
        ))}
        <button type="button" className="btn btn--ghost" onClick={copiar}>
          {copied ? "¡Copiado!" : "Copiar enlace"}
        </button>
      </div>
      {avisoIg && (
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: "0.78rem",
            color: "var(--text-dim)",
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: "var(--text)" }}>Enlace copiado.</b> Pégalo en tu
          historia o DM de Instagram — desde el móvil, el botón abre la lista
          de apps con Instagram incluida.
        </p>
      )}
    </div>
  );
}
