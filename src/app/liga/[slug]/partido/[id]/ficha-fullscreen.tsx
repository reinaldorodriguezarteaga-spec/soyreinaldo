"use client";

import { useRef } from "react";

/**
 * Envuelve la ficha y ofrece verla a pantalla completa (solo la tarjeta
 * sobre el fondo de la web, sin cabecera ni nada alrededor): así la captura
 * para los vídeos sale limpia. Con Esc se vuelve.
 */
export default function FichaFullscreen({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const open = () => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  return (
    <div>
      <div className="ficha__tools">
        <button type="button" className="btn" onClick={open}>
          ⛶ Pantalla completa (para capturar)
        </button>
      </div>
      <div ref={ref} className="ficha__stage">
        {children}
      </div>
    </div>
  );
}
