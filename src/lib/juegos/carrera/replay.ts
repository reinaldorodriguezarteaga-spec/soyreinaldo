import { NACIONES, esClubDeInicio } from "./clubes";
import { crearCarrera, decidir, elegirOpcion, pasarAOfertas, type Estado, type Posicion } from "./motor";

/**
 * Rejugar una carrera a partir de sus decisiones (27-oct, ranking): el motor
 * va con semilla, así que las mismas decisiones dan la misma carrera. El
 * servidor la rejuega y calcula él el legado; el navegador nunca manda la
 * puntuación.
 */

export type Inicio = { nombre: string; nacion: string; posicion: Posicion; clubId: number; semilla: number };
export type Accion =
  | { t: "opcion"; i: number }
  | { t: "ver" }
  | { t: "seguir" }
  | { t: "fichar"; id: number }
  | { t: "retiro" };

const MAX_ACCIONES = 150;

export function aplicar(e: Estado, a: Accion): Estado {
  switch (a.t) {
    case "opcion":
      return elegirOpcion(e, a.i);
    case "ver":
      return pasarAOfertas(e);
    case "seguir":
      return decidir(e, { tipo: "seguir" });
    case "fichar":
      return decidir(e, { tipo: "fichar", clubId: a.id });
    case "retiro":
      return decidir(e, { tipo: "retirarse" });
  }
}

/** La carrera terminada, o null si el inicio o alguna acción no valen. */
export function reproducir(inicio: Inicio, acciones: Accion[]): Estado | null {
  const valido =
    typeof inicio?.nombre === "string" &&
    NACIONES.some((n) => n.codigo === inicio.nacion) &&
    ["POR", "DEF", "MED", "DEL"].includes(inicio.posicion) &&
    esClubDeInicio(inicio.clubId) &&
    Number.isInteger(inicio.semilla) &&
    inicio.semilla >= 0 &&
    inicio.semilla < 1e9 &&
    Array.isArray(acciones) &&
    acciones.length <= MAX_ACCIONES;
  if (!valido) return null;
  let e = crearCarrera(inicio);
  for (const a of acciones) {
    const antes = e;
    e = aplicar(e, a);
    // Una acción que no cambia nada no vale (fase equivocada, oferta que no existe…).
    if (e === antes) return null;
  }
  return e.fase === "fin" ? e : null;
}
