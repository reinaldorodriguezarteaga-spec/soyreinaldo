"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Botón físico de "Atrás" presente en todas las páginas menos el inicio.
 * Vuelve a la página anterior (history back); si no hay historial — p. ej. al
 * abrir un enlace directo en modo app/PWA, donde no hay botón del navegador —
 * cae al inicio para no dejar al usuario sin salida.
 */
export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  // La barra "Atrás" es sticky y debe pegarse JUSTO debajo del header sticky
  // (.nav). Su altura varía (fuentes, breakpoint), así que la medimos y la
  // exponemos en --nav-h para el `top` del CSS. Se re-mide al cambiar de ruta
  // y al redimensionar.
  useEffect(() => {
    if (pathname === "/") return;
    const measure = () => {
      const nav = document.querySelector<HTMLElement>(".nav");
      if (nav) {
        document.documentElement.style.setProperty("--nav-h", `${nav.offsetHeight}px`);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    // Re-medir cuando las fuentes web terminen de cargar (cambian la altura).
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [pathname]);

  // En el inicio no se muestra (ya es la raíz).
  if (pathname === "/") return null;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // Atajo a la quiniela desde una ficha de partido/equipo de cualquier liga —
  // pero no dentro de la propia quiniela, donde ya hay su propia barra de
  // pestañas (Pronósticos/Clasificación/Selecciones/Especiales) y el atajo
  // sería un bucle a la misma sección.
  // (Antes apuntaba también a /quiniela y /mundial — ambos retirados y
  // redirigidos — lo que producía un botón "Mundial" que caía en la portada
  // y un botón "Quiniela" que volvía a la propia página. Limpiado.)
  const showQuiniela =
    pathname.startsWith("/liga/") &&
    (pathname.includes("/partido/") || pathname.includes("/equipo/"));

  return (
    <div className="backbar">
      <div className="wrap backbar__row">
        <button
          type="button"
          onClick={goBack}
          className="backbtn"
          aria-label="Volver a la página anterior"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Atrás
        </button>

        {showQuiniela && (
          <Link href="/quiniela-liga" className="backbtn backbtn--accent">
            🏆 Quiniela
          </Link>
        )}
      </div>
    </div>
  );
}
