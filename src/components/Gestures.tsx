"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Gestos táctiles básicos en cualquier dispositivo táctil (móvil/app):
 *
 *  - Deslizar desde el borde izquierdo → derecha  = atrás.
 *  - Deslizar desde el borde derecho  → izquierda = adelante.
 *  - Tirar hacia abajo estando arriba del todo    = recargar.
 *
 * Se activan sobre punteros "coarse" (táctiles). En Safari/Chrome del móvil, el
 * gesto del borde lo intercepta el navegador de forma nativa (nuestro handler no
 * llega a dispararse), y dentro de la app instalada —donde no hay gesto nativo—
 * sí actúa el nuestro. Así funciona en la app sin duplicarse en el navegador.
 */

const EDGE = 28; // ancho de la zona de borde (px)
const H_TRIGGER = 72; // desplazamiento horizontal para disparar atrás/adelante
const V_TOL = 45; // desviación vertical máxima en un swipe horizontal
const PTR_TRIGGER = 80; // tirón vertical para recargar
const PTR_MAX = 110; // tope visual del indicador

type Mode = "none" | "back" | "fwd" | "ptr";

export default function Gestures() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const st = useRef({ x: 0, y: 0, mode: "none" as Mode });
  const busy = useRef(false);

  useEffect(() => {
    // Solo en dispositivos táctiles (móvil / app instalada). En escritorio no
    // tiene sentido y podría interferir con el ratón/trackpad.
    const touch = window.matchMedia?.("(pointer: coarse)").matches === true;
    if (!touch) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || busy.current) {
        st.current.mode = "none";
        return;
      }
      const t = e.touches[0];
      st.current.x = t.clientX;
      st.current.y = t.clientY;
      const w = window.innerWidth;
      if (t.clientX <= EDGE) st.current.mode = "back";
      else if (t.clientX >= w - EDGE) st.current.mode = "fwd";
      else if (window.scrollY <= 0) st.current.mode = "ptr";
      else st.current.mode = "none";
    };

    const onMove = (e: TouchEvent) => {
      if (st.current.mode !== "ptr") return;
      const t = e.touches[0];
      const dy = t.clientY - st.current.y;
      const dx = Math.abs(t.clientX - st.current.x);
      if (dy > 0 && dx < 60 && window.scrollY <= 0) {
        setPull(Math.min(dy * 0.5, PTR_MAX));
      } else {
        setPull(0);
      }
    };

    const onEnd = (e: TouchEvent) => {
      const mode = st.current.mode;
      st.current.mode = "none";
      const t = e.changedTouches[0];
      const dx = t.clientX - st.current.x;
      const dy = t.clientY - st.current.y;

      if (mode === "back" && dx > H_TRIGGER && Math.abs(dy) < V_TOL) {
        if (window.history.length > 1) router.back();
        else router.push("/");
      } else if (mode === "fwd" && -dx > H_TRIGGER && Math.abs(dy) < V_TOL) {
        router.forward();
      } else if (mode === "ptr" && dy > PTR_TRIGGER && window.scrollY <= 0) {
        busy.current = true;
        setRefreshing(true);
        setPull(PTR_MAX);
        router.refresh();
        window.setTimeout(() => {
          busy.current = false;
          setRefreshing(false);
          setPull(0);
        }, 700);
      } else {
        setPull(0);
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  const visible = pull > 0 || refreshing;
  const y = (refreshing ? PTR_MAX : pull) - 46;
  const rot = Math.min(pull / PTR_TRIGGER, 1) * 180;

  return (
    <div
      aria-hidden
      className={`ptr${refreshing ? " ptr--spin" : ""}`}
      style={{
        transform: `translateX(-50%) translateY(${y}px)`,
        opacity: visible ? 1 : 0,
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={refreshing ? undefined : { transform: `rotate(${rot}deg)` }}
      >
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </div>
  );
}
