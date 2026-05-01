"use client";

import { useEffect, useState } from "react";

/**
 * Botón compacto con icono "compartir" que copia el link de invitación
 * `${origin}/unirse/{code}` al portapapeles. Pensado para inlinearse al lado
 * del nombre de una liga en vistas de admin.
 *
 * Tras copiar muestra un tick animado durante ~1.5s para feedback inmediato.
 */
export default function CopyInviteIcon({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/unirse/${encodeURIComponent(code)}` : "";

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copia este enlace:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!url}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-60 ${
        copied
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-indigo-300 hover:text-indigo-300"
      }`}
      title={copied ? "Copiado" : "Copiar enlace para compartir"}
      aria-label={copied ? "Enlace copiado" : "Copiar enlace de invitación"}
    >
      {copied ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="h-4 w-4"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          className="h-4 w-4"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v12m0-12l-4 4m4-4l4 4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 11v6a3 3 0 003 3h8a3 3 0 003-3v-6"
          />
        </svg>
      )}
    </button>
  );
}
