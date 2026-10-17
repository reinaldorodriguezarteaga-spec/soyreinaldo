"use client";

import { useState, useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};
function cerradaAntes() {
  try {
    const fecha = Number(localStorage.getItem("bienvenida-cerrada") ?? 0);
    return fecha > 0 && Date.now() - fecha < 30 * 86_400_000;
  } catch {
    return false;
  }
}

export default function BienvenidaCerrar({ children }: { children: React.ReactNode }) {
  const oculta = useSyncExternalStore(sinSuscripcion, cerradaAntes, () => true);
  const [cerrada, setCerrada] = useState(false);
  if (oculta || cerrada) return null;

  return (
    <section className="panel bienvenida" aria-labelledby="bienvenida-titulo">
      <button type="button" className="bienvenida__cerrar" aria-label="Cerrar bienvenida durante 30 días" onClick={() => {
        try {
          localStorage.setItem("bienvenida-cerrada", String(Date.now()));
        } catch {
          // Sin almacenamiento, se cierra durante esta visita.
        }
        setCerrada(true);
      }}>✕</button>
      {children}
    </section>
  );
}
