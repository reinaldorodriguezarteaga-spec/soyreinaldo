"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Envuelve una barra de pestañas con scroll horizontal (`.tabs.tabs--scroll`)
 * y añade un degradado + flecha "›" a la derecha cuando quedan pestañas
 * fuera de pantalla — sin esto, nada le dice a la gente que hay que
 * deslizar (reportado en `/quiniela-liga`: "Reglas" quedaba cortada sin
 * ninguna pista). Mismo patrón que ya usaba `/liga/[slug]` (`liga-tabs.tsx`),
 * ahora reutilizable.
 */
export default function ScrollHintTabs({
  children,
  maxWidth,
}: {
  children: React.ReactNode;
  /** Ancho máximo de la barra (mismo uso que el `style` que ya se le pasaba
   * directamente a `.tabs` antes de envolverla). */
  maxWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div style={{ position: "relative", maxWidth }}>
      <div ref={ref} className="tabs tabs--scroll">
        {children}
      </div>
      {moreRight && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 5,
            bottom: 5,
            right: 5,
            width: 54,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 8,
            borderRadius: "var(--radius)",
            background: "linear-gradient(to right, transparent, var(--surface) 68%)",
          }}
        >
          <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", lineHeight: 1 }}>
            ›
          </span>
        </div>
      )}
    </div>
  );
}
