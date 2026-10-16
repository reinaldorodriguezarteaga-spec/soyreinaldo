/**
 * Duelos de la quiniela (16-oct, pedido del dueño): uno contra uno en una
 * jornada, gana quien más puntos saque en ella (baremo de la liga). La tabla
 * de duelos ordena por duelos ganados; al final de la temporada, el primero
 * suma PREMIO_DUELOS puntos a la general (ajuste de la liga).
 */

export const PREMIO_DUELOS = 40;
export const MAX_RETOS_POR_JORNADA = 3;

export type Duelo = {
  id: string;
  matchday: number;
  retador: string;
  retador_nombre: string;
  rival: string;
  rival_nombre: string;
  estado: "pendiente" | "aceptado" | "rechazado";
  pts_retador: number;
  pts_rival: number;
  terminada: boolean;
  empezada: boolean;
};

export type FilaDuelos = {
  userId: string;
  nombre: string;
  ganados: number;
  empatados: number;
  perdidos: number;
};

/** Ganador de un duelo cerrado: id, "empate" o null si aún no ha acabado. */
export function ganadorDuelo(d: Duelo): string | "empate" | null {
  if (d.estado !== "aceptado" || !d.terminada) return null;
  if (d.pts_retador === d.pts_rival) return "empate";
  return d.pts_retador > d.pts_rival ? d.retador : d.rival;
}

export function tablaDuelos(duelos: Duelo[]): FilaDuelos[] {
  const filas = new Map<string, FilaDuelos>();
  const fila = (userId: string, nombre: string) => {
    const f = filas.get(userId) ?? { userId, nombre, ganados: 0, empatados: 0, perdidos: 0 };
    filas.set(userId, f);
    return f;
  };
  for (const d of duelos) {
    const g = ganadorDuelo(d);
    if (g == null) continue;
    const a = fila(d.retador, d.retador_nombre);
    const b = fila(d.rival, d.rival_nombre);
    if (g === "empate") {
      a.empatados++;
      b.empatados++;
    } else if (g === d.retador) {
      a.ganados++;
      b.perdidos++;
    } else {
      b.ganados++;
      a.perdidos++;
    }
  }
  return [...filas.values()].sort(
    (x, y) =>
      y.ganados - x.ganados ||
      y.ganados - y.perdidos - (x.ganados - x.perdidos) ||
      x.nombre.localeCompare(y.nombre, "es"),
  );
}
