"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { publicarComentario } from "../actions";

const MAX = 1000;

/** El borrador vive en localStorage para sobrevivir al viaje al login:
 * escribes sin cuenta, te registras y el texto sigue ahí al volver. */
const claveBorrador = (slug: string) => `comentario-borrador:${slug}`;


function guardarBorrador(slug: string, texto: string) {
  try {
    if (texto.trim()) localStorage.setItem(claveBorrador(slug), texto);
    else localStorage.removeItem(claveBorrador(slug));
  } catch {
    // Sin almacenamiento (incógnito estricto), el borrador simplemente no
    // sobrevive a la navegación. El formulario funciona igual.
  }
}

/**
 * Formulario del tablón. Se enseña también a quien no tiene sesión: puede
 * escribir tranquilamente y es al darle a publicar cuando se le pide la
 * cuenta (con el texto ya a salvo en el borrador). Tras publicar no hace
 * falta refrescar nada a mano: la server action revalida la página y Next
 * repinta la lista con el comentario nuevo.
 */
export default function ComentarioForm({
  slug,
  autenticado,
}: {
  slug: string;
  autenticado: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pedirCuenta, setPedirCuenta] = useState(false);
  const [pending, startTransition] = useTransition();

  // Recuperar el borrador al montar (p. ej. de vuelta del login). El
  // servidor renderiza el cuadro vacío y localStorage solo existe en el
  // cliente: leerlo al montar es exactamente lo que toca, así que la regla
  // se silencia aquí a sabiendas (probado: useSyncExternalStore con
  // serverSnapshot no relee el almacén tras hidratar).
  useEffect(() => {
    try {
      const borrador = localStorage.getItem(claveBorrador(slug));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (borrador) setTexto(borrador);
    } catch {
      // Sin almacenamiento no hay borrador que recuperar.
    }
  }, [slug]);

  function cambiar(valor: string) {
    setTexto(valor);
    guardarBorrador(slug, valor);
  }

  function enviar() {
    const cuerpo = texto.trim();
    if (!cuerpo || pending) return;
    if (!autenticado) {
      setPedirCuenta(true);
      return;
    }
    startTransition(async () => {
      const r = await publicarComentario(slug, cuerpo);
      if (r.error) {
        setError(r.error);
      } else {
        setTexto("");
        setError(null);
        guardarBorrador(slug, "");
      }
    });
  }

  const volverA = `/analisis/${slug}`;

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
        onChange={(e) => cambiar(e.target.value)}
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

      {pedirCuenta && !autenticado && (
        <div
          className="panel"
          style={{ marginTop: 14, padding: 18, borderStyle: "dashed", textAlign: "center" }}
        >
          <p style={{ margin: "0 0 12px", color: "var(--text-dim)" }}>
            Para publicar en el tablón necesitas una cuenta. Tranquilo: tu
            texto queda guardado y te espera al volver.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/login?redirect=${volverA}`}
              className="btn btn--accent"
            >
              Iniciar sesión <span className="arr">→</span>
            </Link>
            <Link href={`/signup?redirect=${volverA}`} className="btn btn--ghost">
              Crear cuenta
            </Link>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: "var(--live, #ff4d57)", fontSize: "0.85rem", marginTop: 8 }}>
          {error}
        </p>
      )}
    </form>
  );
}
