import "server-only";
import { getHeadToHead, isFinal } from "@/lib/sports/api-football";
import type { CaraACara } from "@/app/quiniela-liga/match-card";

/**
 * El último enfrentamiento terminado entre dos equipos, con su marcador.
 *
 * Usa la misma llamada que la pestaña "Cara a cara" de la ficha (last=20,
 * caché de un día) para compartir caché y no gastar cuota de más; además el
 * historial se archiva en la BD, así que sigue saliendo sin cuota. Si falla,
 * null: es un dato de ayuda y no puede tumbar la página.
 */
export async function ultimoCaraACara(a: number, b: number): Promise<CaraACara | null> {
  try {
    const partidos = await getHeadToHead(a, b, { last: 20 });
    const f = partidos.find((p) => isFinal(p) && p.goals.home != null && p.goals.away != null);
    if (!f) return null;
    return {
      fecha: f.fixture.date,
      local: f.teams.home.name,
      visitante: f.teams.away.name,
      golesLocal: f.goals.home!,
      golesVisitante: f.goals.away!,
    };
  } catch {
    return null;
  }
}
