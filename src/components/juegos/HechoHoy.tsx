"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { numeroDelDia } from "@/lib/juegos/diario";
import { hechoElDia } from "@/lib/juegos/racha";

/**
 * Tick verde en la lista de juegos cuando el reto de hoy ya está terminado
 * (18-nov, pedido del dueño). Lee el guardado del navegador; al cambiar el
 * día (medianoche de Madrid) el reto nuevo no está hecho y el tick se va.
 */
export default function HechoHoy({ clave }: { clave: string }) {
  const [hecho, setHecho] = useState(false);

  useEffect(() => {
    const mirar = () => setHecho(hechoElDia(clave, numeroDelDia()));
    mirar();
    // Al volver con «atrás» (caché del navegador) o a la pestaña otro día.
    const visible = () => document.visibilityState === "visible" && mirar();
    window.addEventListener("pageshow", mirar);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("pageshow", mirar);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [clave]);

  if (!hecho) return null;
  return (
    <span className="jg-hecho" role="img" aria-label="Hecho hoy" title="Reto de hoy hecho">
      <Check aria-hidden />
    </span>
  );
}
