import { nombraEquipo } from "@/lib/sports/menciones";

type Vinculo = { title: string; team_id: number | null; fixture_id: number | null };

/** La asignación explícita y los partidos prevalecen sobre la inferencia del título. */
export function esDelEquipo(
  articulo: Vinculo,
  equipo: { id: number; nombre: string; partidos: ReadonlySet<number> },
): boolean {
  if (articulo.team_id === equipo.id) return true;
  if (articulo.fixture_id != null && equipo.partidos.has(articulo.fixture_id)) return true;
  return articulo.team_id == null && nombraEquipo(articulo.title, equipo.nombre);
}
