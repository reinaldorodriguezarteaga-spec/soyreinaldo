"use client";

import { useState, useTransition } from "react";
import { publicarComentario } from "../actions";

const MAX = 1000;

/**
 * Formulario del tablón. Tras publicar no hace falta refrescar nada a mano:
 * la server action revalida la página y Next repinta la lista con el
 * comentario nuevo.
 */
export default function ComentarioForm({ slug }: { slug: string }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    const cuerpo = texto.trim();
    if (!cuerpo || pending) return;
    startTransition(async () => {
      const r = await publicarComentario(slug, cuerpo);
      if (r.error) {
        setError(r.error);
      } else {
        setTexto("");
        setError(null);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <textarea
        className="field"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={MAX}
        placeholder="Tu opinión sobre el análisis…"
        aria-label="Escribe tu comentario"
        style={{ minHeight: 90 }}
      />
      <div
        className="flex items-center justify-between gap-3"
        style={{ marginTop: 10 }}
      >
        <span className="mono" style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>
          {texto.length}/{MAX}
        </span>
        <button
          type="submit"
          className="btn btn--accent"
          disabled={pending || !texto.trim()}
        >
          {pending ? "Publicando…" : "Publicar"}
        </button>
      </div>
      {error && (
        <p style={{ color: "var(--live, #ff4d57)", fontSize: "0.85rem", marginTop: 8 }}>
          {error}
        </p>
      )}
    </form>
  );
}
