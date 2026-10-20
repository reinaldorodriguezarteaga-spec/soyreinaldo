/**
 * Formaciones de la pizarra táctica (20-oct, pedido del dueño).
 *
 * Coordenadas "canónicas" del campo, independientes de cómo se pinte:
 *  - x: a lo largo, 0 = portería del LOCAL, 1 = portería del VISITANTE.
 *  - y: a lo ancho, 0 = banda izquierda del local (arriba en el campo
 *    horizontal), 1 = la derecha.
 * El visitante usa la misma formación reflejada (1 - x, 1 - y): su izquierda
 * queda abajo, como en la tele.
 */

export type Grupo = "G" | "D" | "M" | "F";
export type Hueco = { x: number; y: number; rol: string; grupo: Grupo };
export type Lado = "local" | "visitante";

type Linea = { d: number; roles: string[]; grupo: Grupo };

/** Líneas desde el portero (d = 0) hasta la punta (d = 1). Los roles van de
 * la banda izquierda a la derecha. */
const LINEAS: Record<string, Linea[]> = {
  "4-3-3": [
    { d: 0.27, roles: ["LI", "DFC", "DFC", "LD"], grupo: "D" },
    { d: 0.56, roles: ["MC", "MCD", "MC"], grupo: "M" },
    { d: 0.9, roles: ["EI", "DC", "ED"], grupo: "F" },
  ],
  "4-4-2": [
    { d: 0.27, roles: ["LI", "DFC", "DFC", "LD"], grupo: "D" },
    { d: 0.58, roles: ["MI", "MC", "MC", "MD"], grupo: "M" },
    { d: 0.9, roles: ["DC", "DC"], grupo: "F" },
  ],
  "4-2-3-1": [
    { d: 0.25, roles: ["LI", "DFC", "DFC", "LD"], grupo: "D" },
    { d: 0.47, roles: ["MCD", "MCD"], grupo: "M" },
    { d: 0.7, roles: ["EI", "MP", "ED"], grupo: "M" },
    { d: 0.92, roles: ["DC"], grupo: "F" },
  ],
  "4-1-4-1": [
    { d: 0.25, roles: ["LI", "DFC", "DFC", "LD"], grupo: "D" },
    { d: 0.44, roles: ["MCD"], grupo: "M" },
    { d: 0.66, roles: ["MI", "MC", "MC", "MD"], grupo: "M" },
    { d: 0.92, roles: ["DC"], grupo: "F" },
  ],
  "3-5-2": [
    { d: 0.25, roles: ["DFC", "DFC", "DFC"], grupo: "D" },
    { d: 0.56, roles: ["CAI", "MC", "MCD", "MC", "CAD"], grupo: "M" },
    { d: 0.9, roles: ["DC", "DC"], grupo: "F" },
  ],
  "3-4-3": [
    { d: 0.25, roles: ["DFC", "DFC", "DFC"], grupo: "D" },
    { d: 0.55, roles: ["CAI", "MC", "MC", "CAD"], grupo: "M" },
    { d: 0.88, roles: ["EI", "DC", "ED"], grupo: "F" },
  ],
  "5-3-2": [
    { d: 0.27, roles: ["CAI", "DFC", "DFC", "DFC", "CAD"], grupo: "D" },
    { d: 0.58, roles: ["MC", "MC", "MC"], grupo: "M" },
    { d: 0.9, roles: ["DC", "DC"], grupo: "F" },
  ],
  // Las que más salen en las alineaciones reales del API (fase 3, 20-oct).
  "4-4-1-1": [
    { d: 0.26, roles: ["LI", "DFC", "DFC", "LD"], grupo: "D" },
    { d: 0.54, roles: ["MI", "MC", "MC", "MD"], grupo: "M" },
    { d: 0.74, roles: ["MP"], grupo: "M" },
    { d: 0.92, roles: ["DC"], grupo: "F" },
  ],
  "3-4-2-1": [
    { d: 0.25, roles: ["DFC", "DFC", "DFC"], grupo: "D" },
    { d: 0.5, roles: ["CAI", "MC", "MC", "CAD"], grupo: "M" },
    { d: 0.72, roles: ["MP", "MP"], grupo: "M" },
    { d: 0.92, roles: ["DC"], grupo: "F" },
  ],
  "3-4-1-2": [
    { d: 0.25, roles: ["DFC", "DFC", "DFC"], grupo: "D" },
    { d: 0.5, roles: ["CAI", "MC", "MC", "CAD"], grupo: "M" },
    { d: 0.7, roles: ["MP"], grupo: "M" },
    { d: 0.9, roles: ["DC", "DC"], grupo: "F" },
  ],
  "4-3-1-2": [
    { d: 0.25, roles: ["LI", "DFC", "DFC", "LD"], grupo: "D" },
    { d: 0.48, roles: ["MC", "MCD", "MC"], grupo: "M" },
    { d: 0.7, roles: ["MP"], grupo: "M" },
    { d: 0.9, roles: ["DC", "DC"], grupo: "F" },
  ],
  "4-1-2-1-2": [
    { d: 0.24, roles: ["LI", "DFC", "DFC", "LD"], grupo: "D" },
    { d: 0.4, roles: ["MCD"], grupo: "M" },
    { d: 0.56, roles: ["MC", "MC"], grupo: "M" },
    { d: 0.72, roles: ["MP"], grupo: "M" },
    { d: 0.92, roles: ["DC", "DC"], grupo: "F" },
  ],
  "5-4-1": [
    { d: 0.27, roles: ["CAI", "DFC", "DFC", "DFC", "CAD"], grupo: "D" },
    { d: 0.6, roles: ["MI", "MC", "MC", "MD"], grupo: "M" },
    { d: 0.9, roles: ["DC"], grupo: "F" },
  ],
};

export const FORMACIONES = Object.keys(LINEAS);

/** Jugadores por línea (sin el portero): "4-2-3-1" → [4, 2, 3, 1]. */
export function lineasDe(formacion: string): number[] {
  return (LINEAS[formacion] ?? []).map((l) => l.roles.length);
}

/** Posición de una casilla "fila:columna" de una alineación (fila 1 =
 * portero; la columna va de la banda izquierda del equipo a la derecha),
 * en coordenadas canónicas del local. */
export function puntoDeRejilla(fila: number, filas: number, col: number, cols: number): { x: number; y: number } {
  const d = filas > 1 ? (fila - 1) / (filas - 1) : 0;
  return { x: X_PORTERO + d * (X_PUNTA - X_PORTERO), y: col / (cols + 1) };
}
export const FORMACION_INICIAL = "4-3-3";

/** De dónde a dónde va el bloque de un equipo, en su mitad del campo. */
const X_PORTERO = 0.05;
const X_PUNTA = 0.45;

/** Los 11 huecos de una formación para un lado, en coordenadas canónicas. */
export function huecos(formacion: string, lado: Lado): Hueco[] {
  const lineas = LINEAS[formacion] ?? LINEAS[FORMACION_INICIAL];
  const local: Hueco[] = [{ x: X_PORTERO, y: 0.5, rol: "POR", grupo: "G" }];
  for (const l of lineas) {
    l.roles.forEach((rol, i) => {
      local.push({
        x: X_PORTERO + l.d * (X_PUNTA - X_PORTERO),
        y: (i + 1) / (l.roles.length + 1),
        rol,
        grupo: l.grupo,
      });
    });
  }
  return lado === "local" ? local : local.map((h) => ({ ...h, x: 1 - h.x, y: 1 - h.y }));
}

/** Grupo de un jugador según la posición de la plantilla del API. */
export function grupoDe(posicion: string | null): Grupo | null {
  switch (posicion) {
    case "Goalkeeper":
      return "G";
    case "Defender":
      return "D";
    case "Midfielder":
      return "M";
    case "Attacker":
      return "F";
    default:
      return null;
  }
}

/** Hueco libre más adecuado para un jugador: primero uno de su grupo, si no,
 * el primero libre. -1 si no queda ninguno. */
export function huecoParaJugador(
  formacion: string,
  ocupados: (number | null)[],
  posicion: string | null,
): number {
  const hs = huecos(formacion, "local");
  const grupo = grupoDe(posicion);
  const libre = (i: number) => ocupados[i] == null;
  const delGrupo = hs.findIndex((h, i) => libre(i) && h.grupo === grupo);
  if (delGrupo >= 0) return delGrupo;
  // Un portero solo va a portería; los demás, a cualquier hueco de campo.
  if (grupo === "G") return -1;
  return hs.findIndex((h, i) => libre(i) && h.grupo !== "G");
}

/** Once automático: por cada hueco, el primer jugador libre de su grupo (la
 * plantilla viene ordenada por posición y dorsal). */
export function onceAutomatico(
  formacion: string,
  plantilla: { id: number; position: string | null }[],
): (number | null)[] {
  const usados = new Set<number>();
  const hs = huecos(formacion, "local");
  const out: (number | null)[] = hs.map((h) => {
    const p = plantilla.find((j) => !usados.has(j.id) && grupoDe(j.position) === h.grupo);
    if (!p) return null;
    usados.add(p.id);
    return p.id;
  });
  // Huecos sin jugador de su grupo (plantilla corta): cualquiera de campo.
  return out.map((id, i) => {
    if (id != null || hs[i].grupo === "G") return id;
    const p = plantilla.find((j) => !usados.has(j.id) && grupoDe(j.position) !== "G");
    if (!p) return null;
    usados.add(p.id);
    return p.id;
  });
}
