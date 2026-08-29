"use client";

import { useState, useTransition } from "react";
import { borrarComentario } from "../actions";

/** Borrado del propio comentario (o de cualquiera, si eres el admin). Pide
 * confirmación en el propio botón — sin modal — porque borrar es definitivo. */
export default function BorrarComentario({
  id,
  slug,
}: {
  id: string;
  slug: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();

  function borrar() {
    startTransition(async () => {
      await borrarComentario(id, slug);
    });
  }

  return (
    <button
      type="button"
      className="mono"
      disabled={pending}
      onClick={() => (confirmando ? borrar() : setConfirmando(true))}
      onBlur={() => setConfirmando(false)}
      style={{
        marginTop: 6,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontSize: "0.62rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: confirmando ? "var(--live, #ff4d57)" : "var(--text-dim)",
      }}
    >
      {pending ? "Borrando…" : confirmando ? "¿Seguro? Toca otra vez" : "Borrar"}
    </button>
  );
}
