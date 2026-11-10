"use client";

import { useMemo, useState } from "react";
import { normalizar } from "@/lib/juegos/diario";

export type OpcionBuscador = { id: number; nombre: string; detalle?: string; imagen?: string };

/**
 * Campo con sugerencias para elegir un jugador o un equipo de una lista.
 * Las sugerencias salen al escribir (no antes: así no se adivina por la
 * lista entera). Enter elige la primera.
 */
export default function Buscador({
  opciones,
  usados,
  onElegir,
  etiqueta,
  placeholder,
  disabled = false,
}: {
  opciones: OpcionBuscador[];
  usados: number[];
  onElegir: (id: number) => void;
  etiqueta: string;
  placeholder: string;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtradas = useMemo(() => {
    const n = normalizar(q);
    if (n.length < 2) return [];
    return opciones.filter((o) => !usados.includes(o.id) && normalizar(o.nombre).includes(n)).slice(0, 8);
  }, [q, opciones, usados]);

  function elegir(id: number) {
    onElegir(id);
    setQ("");
  }

  return (
    <div className="jg-busca">
      <label htmlFor="jg-buscador" className="jg-busca__lab">
        {etiqueta}
      </label>
      <input
        id="jg-buscador"
        type="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={q}
        disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && filtradas.length > 0) elegir(filtradas[0].id);
        }}
      />
      {filtradas.length > 0 && (
        <ul className="jg-opciones">
          {filtradas.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => elegir(o.id)}>
                {o.imagen && (
                  // eslint-disable-next-line @next/next/no-img-element -- imágenes de la CDN de la API
                  <img src={o.imagen} alt="" width={22} height={22} loading="lazy" />
                )}
                <span>
                  {o.nombre}
                  {o.detalle && <small className="jg-opciones__det"> · {o.detalle}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && filtradas.length === 0 && <p className="jg-opciones__vacio">Nadie con ese nombre</p>}
    </div>
  );
}
