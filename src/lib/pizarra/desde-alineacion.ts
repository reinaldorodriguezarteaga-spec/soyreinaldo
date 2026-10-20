import type { LineupPlayer } from "@/lib/sports/api-football";
import { FORMACION_INICIAL, FORMACIONES, lineasDe, puntoDeRejilla, type Lado } from "./formaciones";
import type { Punto } from "./estado";

/**
 * La pizarra con la alineación real de un partido (fase 3, 20-oct: botón
 * «Abrir en la pizarra» de la ficha). Si la formación del API está en las
 * nuestras y cuadra fila a fila, cada titular va a su hueco tal cual; si no,
 * se usan los huecos de la inicial movidos a la posición de su casilla.
 */
export type Alineacion = { formation: string | null; startXI: LineupPlayer[] };

export function desdeAlineacion(
  a: Alineacion | null,
  lado: Lado,
): { formacion: string; once: (number | null)[]; movidos: Record<string, Punto> } | null {
  if (!a || a.startXI.length === 0) return null;
  const conCasilla = a.startXI
    .map((p) => {
      const [f, c] = (p.grid ?? "").split(":").map(Number);
      return { p, f, c };
    })
    .filter((x) => Number.isInteger(x.f) && Number.isInteger(x.c) && x.f > 0 && x.c > 0);

  // Sin casillas (pasa en algunas ligas): en orden, con la formación inicial.
  if (conCasilla.length !== a.startXI.length) {
    const once = Array<number | null>(11).fill(null);
    a.startXI.slice(0, 11).forEach((p, i) => (once[i] = p.id));
    return { formacion: FORMACION_INICIAL, once, movidos: {} };
  }

  conCasilla.sort((x, y) => x.f - y.f || x.c - y.c);
  const filas = Math.max(...conCasilla.map((x) => x.f));
  const porFila = new Map<number, number>();
  for (const x of conCasilla) porFila.set(x.f, (porFila.get(x.f) ?? 0) + 1);
  const once: (number | null)[] = conCasilla.slice(0, 11).map((x) => x.p.id);
  while (once.length < 11) once.push(null);

  // ¿Cuadra con una de las nuestras? (líneas sin el portero, en orden)
  const lineas = [...porFila.entries()].sort((x, y) => x[0] - y[0]).slice(1).map(([, n]) => n);
  const formacion = a.formation && FORMACIONES.includes(a.formation) ? a.formation : null;
  if (formacion && lineasDe(formacion).join("-") === lineas.join("-")) {
    return { formacion, once, movidos: {} };
  }

  // No cuadra: cada uno a la posición de su casilla.
  const movidos: Record<string, Punto> = {};
  conCasilla.slice(0, 11).forEach((x, i) => {
    const p = puntoDeRejilla(x.f, filas, x.c, porFila.get(x.f) ?? 1);
    movidos[`${lado}:${i}`] = lado === "local" ? p : { x: 1 - p.x, y: 1 - p.y };
  });
  return { formacion: FORMACION_INICIAL, once, movidos };
}
