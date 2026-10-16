"use client";

import { useSyncExternalStore } from "react";

/** Reloj de minuto compartido: una sola alarma para todas las cuentas atrás. */
function suscribir(cb: () => void) {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
}
const minutoActual = () => Math.floor(Date.now() / 60_000);

/**
 * " · en 2 d 4 h" hasta el inicio de un partido. Solo en el navegador: en el
 * servidor no pinta nada (la hora del servidor no es la del que mira).
 */
export default function CuentaAtras({ iso }: { iso: string }) {
  const minuto = useSyncExternalStore(suscribir, minutoActual, () => null);
  if (minuto == null) return null;
  const min = Math.round(new Date(iso).getTime() / 60_000 - minuto);
  if (min <= 0) return null;
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const texto = d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
  return <span className="cuentaatras"> · en {texto}</span>;
}
