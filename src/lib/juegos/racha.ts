/**
 * Racha de los juegos (23-oct, pedido del dueño): días seguidos con algún
 * reto del día terminado. Con sesión manda la de la base de datos
 * (`juegos_mi_racha`, migración 090); sin sesión, la de este navegador.
 *
 * Solo navegador: `CierreJuego` apunta cada reto del día terminado. Los días
 * jugados antes de existir la racha se recuperan del guardado de cada juego.
 */

const CLAVE = "jg-racha-v1";
/** Guardado de cada juego con `dias` (o el mapa directo, en Once de leyenda). */
const JUEGOS: [clave: string, directo: boolean][] = [
  ["jg-equipo-v1", false],
  ["jg-jugador-v1", false],
  ["jg-tikitaka-v1", false],
  ["jg-leyendas-v1", true],
];

function leerDias(): Set<number> {
  const dias = new Set<number>();
  try {
    for (const d of JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as number[]) if (Number.isInteger(d)) dias.add(d);
    for (const [clave, directo] of JUEGOS) {
      const g = JSON.parse(localStorage.getItem(clave) ?? "null") as Record<string, unknown> | null;
      const mapa = (directo ? g : g?.dias) as Record<string, { fin?: number }> | undefined;
      for (const [d, v] of Object.entries(mapa ?? {})) if (v && typeof v === "object" && v.fin) dias.add(Number(d));
    }
  } catch {
    // Storage bloqueado o corrupto: sin racha local.
  }
  return dias;
}

/** Apunta un reto del día terminado. */
export function apuntarDia(dia: number) {
  try {
    const dias = [...leerDias(), dia].filter((d, i, a) => a.indexOf(d) === i).sort((a, b) => b - a).slice(0, 400);
    localStorage.setItem(CLAVE, JSON.stringify(dias));
  } catch {
    // Sin almacenamiento: la racha solo vale con sesión.
  }
}

/** Días seguidos hasta hoy, o hasta ayer si hoy aún no se ha jugado. */
export function rachaLocal(hoy: number): { racha: number; hoy: boolean } {
  const dias = leerDias();
  let d = dias.has(hoy) ? hoy : hoy - 1;
  let n = 0;
  while (dias.has(d)) {
    n++;
    d--;
  }
  return { racha: n, hoy: dias.has(hoy) };
}
