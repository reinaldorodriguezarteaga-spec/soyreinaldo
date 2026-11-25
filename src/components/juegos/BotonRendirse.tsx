"use client";

import { useEffect, useState } from "react";

/**
 * «Me rindo» de los juegos de adivinar (25-nov-2026). Pide un segundo toque
 * para que un toque sin querer no acabe el reto del día: el primero lo
 * cambia a «¿Seguro?» y, si no se confirma en unos segundos, vuelve solo.
 */
export default function BotonRendirse({ onRendirse, disabled = false }: { onRendirse: () => void; disabled?: boolean }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);

  return (
    <button
      type="button"
      className={`btn btn--ghost jg-rindo${armado ? " is-armado" : ""}`}
      disabled={disabled}
      aria-live="polite"
      onClick={() => {
        if (armado) {
          setArmado(false);
          onRendirse();
        } else setArmado(true);
      }}
    >
      {armado ? "¿Seguro? Toca otra vez para rendirte" : "Me rindo"}
    </button>
  );
}
