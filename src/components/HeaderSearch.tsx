"use client";

import { useEffect, useRef, useState } from "react";
import ResultadosBusqueda from "@/components/search/resultados";
import { useBusqueda } from "@/components/search/use-busqueda";

/**
 * Buscador del header: al tocar la lupa, la barra se despliega EN EL PROPIO
 * header y los resultados caen debajo, sin cambiar de página (pedido del
 * dueño: "se vería más clean"). Los enlaces del nav se apartan hacia abajo
 * mientras está abierta — de eso se encarga `Header`, que es quien conoce
 * ese bloque; aquí solo se avisa de si está abierta o no.
 *
 * La página /buscar sigue existiendo: es la que se puede compartir por
 * enlace y la que usa quien llega desde fuera.
 */
export default function HeaderSearch({
  abierto,
  onAbrir,
  onCerrar,
}: {
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
}) {
  const [q, setQ] = useState("");
  const { term, res, cargando, vacio } = useBusqueda(abierto ? q : "");
  const cajaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Al abrir, el foco va al campo: quien toca la lupa quiere escribir ya.
  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  // Cerrar al pulsar fuera o con Escape, como cualquier desplegable.
  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) cerrar();
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  });

  function cerrar() {
    setQ("");
    onCerrar();
  }

  return (
    <div className="navsearch" ref={cajaRef}>
      {abierto ? (
        <div className="navsearch__caja">
          <svg
            className="navsearch__lupa"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            className="navsearch__input"
            placeholder="Equipo o jugador…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar equipo o jugador"
          />
          <button
            type="button"
            className="navsearch__cerrar"
            onClick={cerrar}
            aria-label="Cerrar búsqueda"
          >
            ✕
          </button>

          {term.length > 0 && (
            <div className="navsearch__panel">
              <ResultadosBusqueda
                term={term}
                res={res}
                cargando={cargando}
                vacio={vacio}
                onNavegar={cerrar}
                compacto
              />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onAbrir}
          aria-label="Buscar equipo o jugador"
          title="Buscar equipo o jugador"
          aria-expanded={false}
          className="grid h-10 w-10 place-items-center rounded-[4px] border border-[var(--line-strong)] text-[var(--text)]"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
