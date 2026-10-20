import { FORMACIONES, huecos, lineasDe } from "@/lib/pizarra/formaciones";

/**
 * Rendimiento por posición (20-oct, pedido del dueño: «Raphinha de extremo
 * izquierdo marca tantos, de 9 tantos»). De cada partido terminado salen,
 * para cada jugador que jugó, la posición en la que lo hizo (de su casilla
 * en la alineación) y lo que hizo (minutos, goles, asistencias, nota).
 *
 * Posición: si la formación del API está en las de la pizarra y cuadra fila
 * a fila, el rol de su hueco; si no, por fila y banda. El suplente hereda la
 * posición del jugador al que sustituye.
 */

export const ROLES: Record<string, string> = {
  POR: "Portero",
  LI: "Lateral izquierdo",
  CAI: "Carrilero izquierdo",
  DFC: "Central",
  LD: "Lateral derecho",
  CAD: "Carrilero derecho",
  MCD: "Pivote",
  MC: "Centrocampista",
  MI: "Interior izquierdo",
  MD: "Interior derecho",
  MP: "Mediapunta",
  EI: "Extremo izquierdo",
  ED: "Extremo derecho",
  DC: "Delantero centro",
};

/** Rol por fila y banda cuando la formación no es de las nuestras. */
function rolGenerico(fila: number, filas: number, col: number, n: number): string {
  if (fila === 1) return "POR";
  const izq = col === 1 && n > 1;
  const der = col === n && n > 1;
  if (fila === filas) {
    if (n >= 3 && izq) return "EI";
    if (n >= 3 && der) return "ED";
    return "DC";
  }
  if (fila === 2) {
    if (n >= 5) return izq ? "CAI" : der ? "CAD" : "DFC";
    if (n === 4) return izq ? "LI" : der ? "LD" : "DFC";
    return "DFC";
  }
  // Medio campo.
  if (n === 1) return fila === filas - 1 ? "MP" : "MCD";
  if (n >= 5) return izq ? "CAI" : der ? "CAD" : "MC";
  if (n === 4) return izq ? "MI" : der ? "MD" : "MC";
  return fila === filas - 1 && n === 2 ? "MP" : "MC";
}

export type Titular = { id: number; grid: string | null };

/** Rol de cada titular (id → rol). Sin casillas, ninguno. */
export function rolesDeAlineacion(formation: string | null, startXI: Titular[]): Map<number, string> {
  const out = new Map<number, string>();
  const casillas = startXI
    .map((p) => {
      const [f, c] = (p.grid ?? "").split(":").map(Number);
      return { id: p.id, f, c };
    })
    .filter((x) => Number.isInteger(x.f) && Number.isInteger(x.c) && x.f > 0 && x.c > 0)
    .sort((a, b) => a.f - b.f || a.c - b.c);
  if (casillas.length === 0) return out;
  const filas = Math.max(...casillas.map((x) => x.f));
  const porFila = new Map<number, number>();
  for (const x of casillas) porFila.set(x.f, (porFila.get(x.f) ?? 0) + 1);

  const lineas = [...porFila.entries()].sort((a, b) => a[0] - b[0]).slice(1).map(([, n]) => n);
  const nuestra = formation && FORMACIONES.includes(formation) && lineasDe(formation).join("-") === lineas.join("-");
  if (nuestra && casillas.length === 11) {
    const hs = huecos(formation!, "local");
    casillas.forEach((x, i) => out.set(x.id, hs[i].rol));
    return out;
  }
  for (const x of casillas) out.set(x.id, rolGenerico(x.f, filas, x.c, porFila.get(x.f) ?? 1));
  return out;
}

export type Cambio = { teamId: number; sale: number | null; entra: number | null; minuto: number | null };

/** Los suplentes heredan el rol del que sale, en orden de minuto. */
export function conSuplentes(roles: Map<number, string>, cambios: Cambio[]): Map<number, string> {
  const out = new Map(roles);
  for (const c of [...cambios].sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0))) {
    if (c.sale == null || c.entra == null) continue;
    const rol = out.get(c.sale);
    if (rol && !out.has(c.entra)) out.set(c.entra, rol);
  }
  return out;
}

export type Fila = { rol: string; minutos: number; goles: number; asistencias: number; nota: number | null };
export type Resumen = {
  rol: string;
  nombre: string;
  partidos: number;
  minutos: number;
  goles: number;
  asistencias: number;
  nota: number | null;
  /** Goles + asistencias cada 90 minutos. */
  ga90: number;
};

/** Agrupa las apariciones de un jugador por rol, de más a menos minutos. */
export function resumenPorRol(filas: Fila[]): Resumen[] {
  const m = new Map<string, Fila[]>();
  for (const f of filas) m.set(f.rol, [...(m.get(f.rol) ?? []), f]);
  return [...m.entries()]
    .map(([rol, fs]) => {
      const minutos = fs.reduce((n, f) => n + f.minutos, 0);
      const goles = fs.reduce((n, f) => n + f.goles, 0);
      const asistencias = fs.reduce((n, f) => n + f.asistencias, 0);
      const notas = fs.map((f) => f.nota).filter((x): x is number => x != null);
      return {
        rol,
        nombre: ROLES[rol] ?? rol,
        partidos: fs.length,
        minutos,
        goles,
        asistencias,
        nota: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : null,
        ga90: minutos > 0 ? Math.round(((goles + asistencias) * 90 * 100) / minutos) / 100 : 0,
      };
    })
    .sort((a, b) => b.minutos - a.minutos);
}
