"use client";

import { useState, useTransition } from "react";
import { resolveR32Action } from "./actions";

export default function ResolveBracketButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            const res = await resolveR32Action();
            if (!res.ok) {
              setMsg(`⚠ ${res.message ?? "Error"}`);
              return;
            }
            setMsg(
              res.resolved === 0
                ? "Sin cambios — los grupos relevantes aún no están completos."
                : `✓ ${res.resolved} slot${res.resolved === 1 ? "" : "s"} resuelto${res.resolved === 1 ? "" : "s"}.`,
            );
          });
        }}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Resolviendo..." : "🏗 Resolver bracket"}
      </button>
      {msg && <span className="text-xs text-zinc-300">{msg}</span>}
    </div>
  );
}
