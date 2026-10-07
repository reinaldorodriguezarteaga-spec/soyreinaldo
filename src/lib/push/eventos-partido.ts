/**
 * Qué aviso merece un cambio de estado de un partido entre dos pasadas de la
 * ingesta (estados de API-Football). Solo se avisa del inicio si se pilla en
 * la primera parte: si la ingesta lo ve ya en la segunda (caída, retraso),
 * "empieza el partido" sería mentira.
 */
const FINALES = new Set(["FT", "AET", "PEN"]);
const SIN_EMPEZAR = new Set(["NS", "TBD"]);

export type EventoPartido = "inicio" | "final" | null;

export function eventoPartido(
  antes: string | null | undefined,
  ahora: string,
): EventoPartido {
  if (FINALES.has(ahora) && !(antes && FINALES.has(antes))) return "final";
  if (ahora === "1H" && (!antes || SIN_EMPEZAR.has(antes))) return "inicio";
  return null;
}
