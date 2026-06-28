"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * Botón físico de "Atrás" presente en todas las páginas menos el inicio.
 * Vuelve a la página anterior (history back); si no hay historial — p. ej. al
 * abrir un enlace directo en modo app/PWA, donde no hay botón del navegador —
 * cae al inicio para no dejar al usuario sin salida.
 */
export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  // En el inicio no se muestra (ya es la raíz).
  if (pathname === "/") return null;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="backbar">
      <div className="wrap">
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
      </div>
    </div>
  );
}
