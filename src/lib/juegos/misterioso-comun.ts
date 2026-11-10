import type { Futbolista } from "./futbolistas-comun";

/**
 * «Futbolista misterioso»: cada intento se compara con el misterioso en
 * liga, equipo, posición, país, edad y dorsal. Verde = igual; amarillo = cerca
 * (edad a 2 años o menos, dorsal a 3 o menos); la flecha dice hacia dónde.
 */

export const MAX_INTENTOS_MISTERIOSO = 8;

export type Estado = "ok" | "cerca" | "no";
export type Pista = { campo: string; texto: string; estado: Estado; flecha?: "arriba" | "abajo"; bandera?: string | null };

function numero(campo: string, a: number | null, b: number | null, margen: number, sufijo = ""): Pista {
  if (a == null || b == null) return { campo, texto: a == null ? "—" : `${a}${sufijo}`, estado: "no" };
  if (a === b) return { campo, texto: `${a}${sufijo}`, estado: "ok" };
  return { campo, texto: `${a}${sufijo}`, estado: Math.abs(a - b) <= margen ? "cerca" : "no", flecha: b > a ? "arriba" : "abajo" };
}

export function comparar(intento: Futbolista, misterioso: Futbolista): Pista[] {
  return [
    { campo: "Liga", texto: intento.liga.nombre, estado: intento.liga.id === misterioso.liga.id ? "ok" : "no" },
    { campo: "Equipo", texto: intento.equipo.nombre, estado: intento.equipo.id === misterioso.equipo.id ? "ok" : "no" },
    { campo: "Posición", texto: intento.posicion ?? "—", estado: intento.posicion && intento.posicion === misterioso.posicion ? "ok" : "no" },
    {
      campo: "País",
      texto: intento.pais ?? "—",
      bandera: intento.bandera,
      estado: intento.pais && intento.pais === misterioso.pais ? "ok" : "no",
    },
    numero("Edad", intento.edad, misterioso.edad, 2),
    numero("Dorsal", intento.dorsal, misterioso.dorsal, 3),
  ];
}
