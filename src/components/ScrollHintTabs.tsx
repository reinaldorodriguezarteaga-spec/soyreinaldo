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
  const [moreLeft, setMoreLeft] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
      setMoreLeft(el.scrollLeft > 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // "Asomadita" al montar: si hay pestañas fuera de pantalla, la barra se
  // desliza sola unos px y vuelve — demuestra el gesto en vez de confiar en
  // que la gente interprete la flecha (feedback real: con solo el degradado
  // + "›" seguía sin verse que había más). Se salta si el usuario ya tocó/
  // scrolleó la barra o si pide menos animaciones (prefers-reduced-motion).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth + 4) return; // no desborda
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    // Cualquier gesto del usuario sobre la barra cancela la demo — que nunca
    // pelee contra un scroll real.
    el.addEventListener("touchstart", cancel, { passive: true, once: true });
    el.addEventListener("pointerdown", cancel, { once: true });

    const t1 = setTimeout(() => {
      if (cancelled || el.scrollLeft > 0) return;
      el.scrollTo({ left: 72, behavior: "smooth" });
    }, 600);
    const t2 = setTimeout(() => {
      if (cancelled) return;
      el.scrollTo({ left: 0, behavior: "smooth" });
    }, 1350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      el.removeEventListener("touchstart", cancel);
      el.removeEventListener("pointerdown", cancel);
    };
  }, []);

  // BOTONES de verdad, no adornos: la primera versión llevaba
  // pointerEvents:none y el toque atravesaba hasta lo que hubiera debajo
  // (reportado por el dueño con captura: en la quiniela el clic caía en
  // otro control). Desplazan la barra un 70% de su ancho visible.
  function scrollTabs(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(120, el.clientWidth * 0.7),
      behavior: "smooth",
    });
  }

  return (
    <div style={{ position: "relative", maxWidth }}>
      <div ref={ref} className="tabs tabs--scroll">
        {children}
      </div>
      {moreLeft && (
        <button
          type="button"
          className="tabs__more tabs__more--left"
          aria-label="Pestañas anteriores"
          onClick={() => scrollTabs(-1)}
        >
          ‹
        </button>
      )}
      {moreRight && (
        <button
          type="button"
          className="tabs__more"
          aria-label="Ver más pestañas"
          onClick={() => scrollTabs(1)}
        >
          ›
        </button>
      )}
    </div>
  );
}
