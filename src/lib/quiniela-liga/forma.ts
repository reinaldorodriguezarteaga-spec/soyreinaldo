/**
 * Datos de ayuda para pronosticar: puesto en la tabla, diferencia de goles y
 * resultado del último partido de cada equipo (pedido del dueño, 7-oct).
 *
 * Puesto y DG salen de la clasificación oficial (caché del cron) cuando la
 * hay; si no, se calculan con los resultados de `lq_matches` (puntos, luego
 * DG, luego goles a favor — LaLiga desempata por el cara a cara, así que en
 * un empate exacto podría diferir un puesto). La racha (últimos 5, del más
 * antiguo al más reciente) sale siempre de `lq_matches`: es nuestro dato y
 * no depende de la API.
 */

export type ResultadoCorto = "V" | "E" | "D";
export type FormaEquipo = {
  puesto: number | null;
  dg: number | null;
  /** Últimos resultados, del más antiguo al más reciente (máx. RACHA). */
  racha: ResultadoCorto[];
};

export const RACHA = 5;

export type PartidoJugado = {
  local: number;
  visitante: number;
  golesLocal: number;
  golesVisitante: number;
  kickoffAt: string;
};

export type FilaOficial = { teamId: number; puesto: number; dg: number };

export function formaEquipos(
  jugados: PartidoJugado[],
  oficial: FilaOficial[] | null,
): Map<number, FormaEquipo> {
  const tabla = new Map<number, { pts: number; gf: number; gc: number }>();
  const historial = new Map<number, { t: number; r: ResultadoCorto }[]>();
  const anotar = (equipo: number, gf: number, gc: number, t: number) => {
    const fila = tabla.get(equipo) ?? { pts: 0, gf: 0, gc: 0 };
    const r: ResultadoCorto = gf > gc ? "V" : gf === gc ? "E" : "D";
    fila.pts += r === "V" ? 3 : r === "E" ? 1 : 0;
    fila.gf += gf;
    fila.gc += gc;
    tabla.set(equipo, fila);
    historial.set(equipo, [...(historial.get(equipo) ?? []), { t, r }]);
  };
  for (const p of jugados) {
    const t = Date.parse(p.kickoffAt);
    anotar(p.local, p.golesLocal, p.golesVisitante, t);
    anotar(p.visitante, p.golesVisitante, p.golesLocal, t);
  }

  const calculado = new Map<number, { puesto: number; dg: number }>();
  [...tabla.entries()]
    .sort(
      ([, a], [, b]) =>
        b.pts - a.pts || b.gf - b.gc - (a.gf - a.gc) || b.gf - a.gf,
    )
    .forEach(([id, f], i) => calculado.set(id, { puesto: i + 1, dg: f.gf - f.gc }));

  const usarOficial = oficial && oficial.length > 0;
  const deOficial = new Map((oficial ?? []).map((f) => [f.teamId, f]));
  const out = new Map<number, FormaEquipo>();
  const ids = new Set([...calculado.keys(), ...deOficial.keys()]);
  for (const id of ids) {
    const fuente = usarOficial ? deOficial.get(id) : calculado.get(id);
    out.set(id, {
      puesto: fuente?.puesto ?? null,
      dg: fuente?.dg ?? null,
      racha: (historial.get(id) ?? [])
        .sort((a, b) => a.t - b.t)
        .slice(-RACHA)
        .map((h) => h.r),
    });
  }
  return out;
}
