import type { Etapa, Flecha, Punto } from "./estado";

/**
 * Animación por etapas (fase 3, 20-oct): se queda PAUSA s en cada etapa y
 * tarda TRANSICION s en ir a la siguiente, con aceleración suave. Cada
 * jugador se mueve de su posición en una etapa a la de la siguiente; el que
 * solo está en una de las dos se queda donde esté. Las flechas son las de la
 * etapa en la que se está (o de la que se sale).
 */
export const PAUSA = 0.7;
export const TRANSICION = 1.2;

export const duracion = (etapas: number) => (etapas <= 0 ? 0 : etapas * PAUSA + (etapas - 1) * TRANSICION);

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const mezcla = (a: Punto, b: Punto, t: number): Punto => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export type Fotograma = { jug: Record<string, Punto>; balon: Punto | null; flechas: Flecha[]; etapa: number };

/** Cómo está la pizarra en el segundo `t` de la animación. */
export function fotograma(etapas: Etapa[], t: number): Fotograma | null {
  if (etapas.length === 0) return null;
  const tramo = PAUSA + TRANSICION;
  const k = Math.min(etapas.length - 1, Math.max(0, Math.floor(t / tramo)));
  const dentro = t - k * tramo;
  const a = etapas[k];
  const b = etapas[k + 1];
  if (!b || dentro <= PAUSA) return { ...a, jug: { ...a.jug }, etapa: k };
  const f = suave(Math.min(1, (dentro - PAUSA) / TRANSICION));
  const jug: Record<string, Punto> = { ...a.jug };
  for (const [clave, p] of Object.entries(b.jug)) jug[clave] = a.jug[clave] ? mezcla(a.jug[clave], p, f) : p;
  const balon = a.balon && b.balon ? mezcla(a.balon, b.balon, f) : (b.balon ?? a.balon);
  return { jug, balon, flechas: a.flechas, etapa: k };
}
