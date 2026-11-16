"use client";

import { useEffect } from "react";

/**
 * La lista de juegos siempre arranca arriba. Al volver de un juego (atrás o
 * el botón «Todos los juegos») el navegador restauraba el scroll del juego y
 * la página aparecía al final, con los juegos fuera de la vista (16-nov).
 */
export default function ArribaAlEntrar() {
  useEffect(() => {
    const arriba = () => window.scrollTo(0, 0);
    arriba();
    // Next y el navegador restauran el scroll después del primer pintado.
    const raf = requestAnimationFrame(arriba);
    const t = setTimeout(arriba, 60);
    // Volver con la caché atrás/adelante del navegador no vuelve a montar.
    const alMostrar = (e: PageTransitionEvent) => {
      if (e.persisted) arriba();
    };
    window.addEventListener("pageshow", alMostrar);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("pageshow", alMostrar);
    };
  }, []);
  return null;
}
