"use client";

import { useState, useTransition } from "react";
import { cambiarPermiso } from "./acciones";
import { PERMISOS, type Permiso } from "@/lib/permisos-lista";

/** Dar permiso a un usuario por su nombre de usuario, y quitarlo desde la lista. */
export function DarPermiso() {
  const [usuario, setUsuario] = useState("");
  const [permiso, setPermiso] = useState<Permiso>("imagenes");
  const [msg, setMsg] = useState<string | null>(null);
  const [enviando, empezar] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        empezar(async () => {
          const r = await cambiarPermiso(usuario, permiso, true);
          setMsg(r.ok ? `✓ Permiso dado a ${usuario}` : (r.error ?? "Error"));
          if (r.ok) setUsuario("");
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Usuario
        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="nombre de usuario" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Permiso
        <select value={permiso} onChange={(e) => setPermiso(e.target.value as Permiso)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2">
          {(Object.keys(PERMISOS) as Permiso[]).map((p) => (
            <option key={p} value={p}>
              {PERMISOS[p]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn--accent" disabled={enviando || !usuario.trim()}>
        {enviando ? "Guardando…" : "Dar permiso"}
      </button>
      {msg && <p className="w-full text-sm text-zinc-300">{msg}</p>}
    </form>
  );
}

export function QuitarPermiso({ usuario, permiso }: { usuario: string; permiso: Permiso }) {
  const [enviando, empezar] = useTransition();
  return (
    <button
      type="button"
      className="ml-1 rounded-full bg-zinc-800 px-2 text-xs text-zinc-300 hover:bg-red-900"
      disabled={enviando}
      onClick={() => empezar(async () => void (await cambiarPermiso(usuario, permiso, false)))}
      aria-label={`Quitar ${PERMISOS[permiso]} a ${usuario}`}
    >
      {PERMISOS[permiso]} ×
    </button>
  );
}
