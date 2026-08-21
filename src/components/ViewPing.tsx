"use client";

import { useEffect } from "react";
import { marcarVista } from "@/app/analisis/actions";

/** Cuánto hay que quedarse para que cuente como lectura. */
const RETARDO_MS = 3000;

/**
 * Cuenta una lectura del análisis, pero solo cuando la hace una persona.
 *
 * Dos filtros a propósito, porque esta web la crawlean mucho (el último
 * incidente fue el rastreador de IA de Meta con 35.100 peticiones en 24 h
 * falseando el User-Agent de un navegador):
 *
 * 1. Se dispara desde el NAVEGADOR y con 3 segundos de retardo. Un rastreador
 *    ni ejecuta este ciclo ni espera; quien abre y cierra al instante,
 *    tampoco cuenta — y eso es lo correcto, no ha leído nada.
 * 2. Una sola vez por artículo y pestaña (sessionStorage), para que recargar
 *    o volver atrás no infle el número.
 *
 * El filtro de User-Agent vive además en el SQL, que es donde se ve de verdad.
 */
export default function ViewPing({ slug }: { slug: string }) {
  useEffect(() => {
    const clave = `sr_vista_${slug}`;
    try {
      if (sessionStorage.getItem(clave)) return;
    } catch {
      // Modo privado sin almacenamiento: seguimos, peor es no contar nada.
    }

    const t = setTimeout(() => {
      // Si la pestaña nunca ha estado visible, no es una lectura (prerender,
      // pestaña abierta en segundo plano y olvidada…).
      if (document.visibilityState !== "visible") return;
      try {
        sessionStorage.setItem(clave, "1");
      } catch {
        // Da igual: como mucho contamos dos veces en la misma pestaña.
      }
      void marcarVista(slug);
    }, RETARDO_MS);

    return () => clearTimeout(t);
  }, [slug]);

  return null;
}
