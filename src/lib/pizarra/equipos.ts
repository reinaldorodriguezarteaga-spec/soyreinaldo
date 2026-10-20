import "server-only";
import { unstable_cache } from "next/cache";
import { getCompetitionStandings, type StandingRow } from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { equiposEnEspanol } from "@/lib/sports/nombres";

/**
 * Equipos que se pueden elegir en la pizarra, por liga: los de las
 * clasificaciones ya guardadas (sin gastar cuota). Las competiciones europeas
 * van al final y solo con los equipos que no salen en una liga de arriba
 * (así entran Bayern, Inter de Milán de Champions, etc.).
 */
const LIGAS = ["laliga", "premier", "serie-a", "ligue-1", "liga-mx", "liga-argentina", "mls", "liga-saudi"];
const EUROPA = ["champions", "europa", "conference"];

export type EquipoPizarra = { id: number; name: string; logo: string };
export type GrupoEquipos = { liga: string; nombre: string; equipos: EquipoPizarra[] };

export const equiposPizarra = unstable_cache(
  async (): Promise<GrupoEquipos[]> => {
    const vistos = new Set<number>();
    const grupos: GrupoEquipos[] = [];
    for (const slug of [...LIGAS, ...EUROPA]) {
      const comp = COMPETITIONS_BY_SLUG[slug];
      if (!comp) continue;
      const filas = ((await getCompetitionStandings(comp).catch(() => null)) ?? []) as StandingRow[];
      // Ligas con varias tablas (MLS por conferencias, Argentina por zonas)
      // repiten equipo: uno por id.
      const unicos = new Map<number, StandingRow["team"]>();
      for (const r of equiposEnEspanol(filas) as StandingRow[]) {
        if (r.team && !vistos.has(r.team.id)) unicos.set(r.team.id, r.team);
      }
      const equipos = [...unicos.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
      for (const t of equipos) vistos.add(t.id);
      if (equipos.length) {
        grupos.push({
          liga: slug,
          nombre: EUROPA.includes(slug) ? `${comp.name} (otros)` : comp.name,
          equipos: equipos.map((t) => ({ id: t.id, name: t.name, logo: t.logo })),
        });
      }
    }
    return grupos;
  },
  ["pizarra-equipos-v2"],
  { revalidate: 6 * 3600 },
);
