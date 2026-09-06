"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Aire alrededor de la tarjeta al escalarla para que quepa en el viewport. */
const MARGIN = 24;

type Mode = "off" | "native" | "fake";

/**
 * Envuelve la ficha y ofrece verla a pantalla completa (solo la tarjeta
 * sobre el fondo de la web, sin cabecera ni nada alrededor): así la captura
 * para los vídeos sale limpia.
 *
 * En móvil el botón se quedaba corto por dos motivos que no tienen que ver
 * entre sí:
 *
 * 1. iOS Safari no implementa `Element.requestFullscreen` en absoluto — no
 *    es un fallo nuestro, es una limitación conocida de WebKit. El `?.()`
 *    de la versión anterior evitaba el crash, pero entonces no pasaba nada
 *    en absoluto: el botón parecía no responder. Aquí, si el método no
 *    existe o el navegador lo rechaza, se SIMULA la pantalla completa por
 *    CSS (`position: fixed` a toda la ventana) — cierra con el propio botón
 *    (que pasa a decir "Salir") o con Esc si hay teclado.
 *
 * 2. La tarjeta tiene un ancho de diseño fijo (720px, `.ficha__body` a dos
 *    columnas) y por debajo de eso el CSS la apila en una sola columna —
 *    perfecto para leerla en el móvil normal, pero deja de ser "la misma
 *    ficha cuadrada" que en escritorio, que es justo lo que se quiere para
 *    capturar. En modo captura (nativo o simulado) medimos el tamaño real
 *    de la tarjeta SIN tocar su layout y le aplicamos un `transform:
 *    scale()` para que quepa en lo que haya de viewport — la misma ficha,
 *    más pequeña, nunca la versión apilada.
 */
export default function FichaFullscreen({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("off");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  const capturing = mode !== "off";

  const measure = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    setNatural({ w: el.scrollWidth, h: el.scrollHeight });
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  // Mientras se está capturando, re-medir en cada cambio de tamaño (rotar el
  // móvil, entrar/salir de fullscreen real también dispara resize) y cuando
  // el propio contenido de la ficha cambie (los goles de un directo siguen
  // llegando y la cabecera puede crecer).
  useEffect(() => {
    if (!capturing) return;
    measure();
    const ro = new ResizeObserver(measure);
    if (cardRef.current) ro.observe(cardRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [capturing, measure]);

  useEffect(() => {
    function onFsChange() {
      setMode((m) => {
        if (document.fullscreenElement) return "native";
        // Salir del fullscreen nativo no debe reactivar el modo simulado.
        return m === "native" ? "off" : m;
      });
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // El modo simulado no tiene el Esc nativo del navegador — se lo damos.
  useEffect(() => {
    if (mode !== "fake") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMode("off");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  async function toggle() {
    if (capturing) {
      if (document.fullscreenElement) await document.exitFullscreen();
      else setMode("off");
      return;
    }
    const el = stageRef.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return; // el listener de fullscreenchange pone mode="native"
      } catch {
        // Existe pero el navegador lo rechazó (algún WebView embebido) —
        // seguimos al modo simulado en vez de dejar el botón sin efecto.
      }
    }
    setMode("fake");
  }

  const scale =
    capturing && natural && viewport && natural.w > 0 && natural.h > 0
      ? Math.min(
          1,
          (viewport.w - MARGIN * 2) / natural.w,
          (viewport.h - MARGIN * 2) / natural.h,
        )
      : 1;

  return (
    <div>
      <div className="ficha__tools">
        <button type="button" className="btn" onClick={toggle}>
          {capturing ? "✕ Salir de pantalla completa" : "⛶ Pantalla completa (para capturar)"}
        </button>
      </div>
      <div
        ref={stageRef}
        className={`ficha__stage${mode === "fake" ? " ficha__stage--fake" : ""}`}
      >
        <div
          style={
            capturing && natural
              ? { width: natural.w * scale, height: natural.h * scale, overflow: "hidden" }
              : undefined
          }
        >
          <div
            ref={cardRef}
            style={
              capturing
                ? {
                    // max-content SIEMPRE en captura, incluso antes de saber
                    // el scale: si no, la primera medición (la que decide
                    // "natural") se haría con el wrapper ya encogido por su
                    // padre, y el cálculo partiría de un tamaño ya roto.
                    width: "max-content",
                    ...(scale !== 1
                      ? { transform: `scale(${scale})`, transformOrigin: "top left" }
                      : {}),
                  }
                : undefined
            }
          >
            {children}
          </div>
        </div>
        {mode === "fake" && (
          <button
            type="button"
            className="ficha__closefake"
            onClick={() => setMode("off")}
            aria-label="Cerrar pantalla completa"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
