"use client";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Flecha de "Atrás" en todas las páginas menos el inicio. Vuelve a la página
 * anterior (history back); si no hay historial — p. ej. al abrir un enlace
 * directo en modo app/PWA, donde no hay botón del navegador — cae al inicio
 * para no dejar al usuario sin salida.
 *
 * 31-oct (estilo iOS): vive dentro de la cabecera, a la izquierda del logo.
 * Antes era una barra entera bajo la cabecera (~60 px) solo para este botón.
 */
export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button type="button" onClick={goBack} className="backbtn backbtn--solo" aria-label="Volver a la página anterior">
      <ChevronLeft aria-hidden />
    </button>
  );
}
