"use client";

import { useEffect, useState } from "react";

export default function CopyJoinLink({ code }: { code: string }) {
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
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Older browsers / insecure contexts: fall back to a prompt so the
      // user can copy manually.
      window.prompt("Copia este enlace:", url);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Enlace para invitar</h3>
        <span className="text-[11px] text-zinc-500">
          Quien lo abra ve la liga y se une con un click (tras login).
        </span>
      </div>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={url}
          readOnly
          onClick={(e) => e.currentTarget.select()}
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300 focus:border-indigo-300 focus:outline-none"
        />
        <button
          type="button"
          onClick={copy}
          disabled={!url}
          className="shrink-0 rounded-xl border border-indigo-300/50 bg-indigo-300/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-300/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
