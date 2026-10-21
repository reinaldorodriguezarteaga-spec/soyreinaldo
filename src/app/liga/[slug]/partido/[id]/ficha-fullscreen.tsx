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
export default function FichaFullscreen({
  children,
  nombreFoto = "ficha.png",
  textoFoto = "",
}: {
  children: React.ReactNode;
  /** Nombre del archivo de «Crear foto». */
  nombreFoto?: string;
  /** Texto que acompaña a la foto al compartirla. */
  textoFoto?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLDivElement>(null);
  const [foto, setFoto] = useState<"off" | "preparando">("off");
  const cardRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("off");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  const capturing = mode !== "off";

  const measure = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    // Pellizcando para ampliar, la parte visible (visualViewport) encoge: si
    // aquí se recalculaba la escala, la ficha se encogía a la vez y el zoom
    // se deshacía solo (13-oct, iPhone). Con zoom puesto no se toca nada.
    const vv = window.visualViewport;
    if (vv && vv.scale > 1.01) return;
    setNatural({ w: el.scrollWidth, h: el.scrollHeight });
    // visualViewport es el tamaño VISUAL real en iOS Safari — con la barra
    // de direcciones colapsándose o un position:fixed recién aplicado,
    // window.innerWidth/innerHeight pueden ir un paso por detrás.
    setViewport({ w: vv?.width ?? window.innerWidth, h: vv?.height ?? window.innerHeight });
  }, []);

  // Mientras se está capturando, re-medir en cada cambio de tamaño (rotar el
  // móvil, entrar/salir de fullscreen real también dispara resize) y cuando
  // el propio contenido de la ficha cambie (los goles de un directo siguen
  // llegando y la cabecera puede crecer).
  useEffect(() => {
    if (!capturing) return;
    // No measure() directo en el mismo tick: al activar el modo captura, el
    // cambio de CSS (width:max-content, @container, position:fixed del modo
    // simulado) todavía no ha terminado su reflow — medir ahí mismo capturaba
    // tamaños a medio aplicar (visto en un iPhone real: la columna de
    // estadísticas se salía de la pantalla porque el scale se calculó sobre
    // un ancho más angosto del que la tarjeta acabó ocupando).
    //
    // requestAnimationFrame sería la forma "correcta" de esperar ese reflow,
    // pero NO se dispara si la pestaña no está pintando en primer plano en
    // ese instante (confirmado: se queda colgado sin límite) — un riesgo
    // real de dejar la tarjeta invisible para siempre si el usuario cambia
    // de app justo al tocar el botón. setTimeout sí corre pase lo que pase;
    // dos disparos (rápido y de respaldo) por si el primero mide antes de
    // que el layout asiente del todo.
    const t1 = setTimeout(measure, 60);
    const t2 = setTimeout(measure, 250);
    const ro = new ResizeObserver(measure);
    if (cardRef.current) ro.observe(cardRef.current);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
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

  /**
   * «Crear foto» (21-oct, pedido del dueño): la ficha como imagen sin pasar
   * por la pantalla completa. Se pinta una copia fuera de la pantalla a su
   * ancho de diseño (720 px, dos columnas también en el móvil: el layout va
   * por @container) y html-to-image la convierte en PNG. En el móvil abre
   * la hoja de compartir con la foto; en el escritorio la descarga.
   */
  async function crearFoto() {
    if (foto !== "off") return;
    setFoto("preparando");
    try {
      // Que la copia se monte y cargue escudos y fotos antes de capturar.
      await new Promise((r) => setTimeout(r, 400));
      const nodo = fotoRef.current;
      if (!nodo) throw new Error("sin nodo");
      const { toBlob } = await import("html-to-image");
      const fondo = getComputedStyle(document.body).backgroundColor || "#0a1030";
      const blob = await toBlob(nodo, { pixelRatio: 2, backgroundColor: fondo });
      if (!blob) throw new Error("sin imagen");
      const archivo = new File([blob], nombreFoto, { type: "image/png" });
      if (navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], text: textoFoto });
        } catch {
          // Hoja cerrada: no es un error.
        }
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = nombreFoto;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      }
    } catch {
      alert("No se pudo crear la foto. Prueba con la pantalla completa y una captura.");
    } finally {
      setFoto("off");
    }
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
        <button type="button" className="btn btn--accent" onClick={crearFoto} disabled={foto !== "off"}>
          📸 {foto === "off" ? "Crear foto" : "Creando foto…"}
        </button>
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
            capturing
              ? natural
                ? { width: natural.w * scale, height: natural.h * scale, overflow: "hidden" }
                // Antes de la primera medición (mientras esperamos el doble
                // rAF de más arriba): oculto, no a tamaño 0 — así no hay un
                // parpadeo con la tarjeta a tamaño completo sin escalar.
                : { opacity: 0 }
              : // Fuera del modo captura, ocupar el ancho disponible: como hijo
                // de un flex centrado, sin esto medía lo que la ficha (720 px)
                // y en el móvil se salía por los dos lados, con el lado
                // izquierdo cortado e inalcanzable (13-oct).
                { width: "100%", minWidth: 0 }
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
      {/* La copia para «Crear foto»: fuera de la pantalla, a su ancho de
          diseño, solo mientras se prepara. */}
      {foto !== "off" && (
        <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, width: "max-content", pointerEvents: "none" }}>
          <div ref={fotoRef} className="ficha__foto">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
