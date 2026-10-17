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

/** IDs de API-Football facilitados para los filtros editoriales. */
export const EQUIPOS_ANALISIS = [
  { id: 529, nombre: "Barcelona", etiqueta: "Barcelona", de: "del Barça" },
  { id: 541, nombre: "Real Madrid", etiqueta: "Real Madrid", de: "del Real Madrid" },
  { id: 530, nombre: "Atlético Madrid", etiqueta: "Atlético Madrid", de: "del Atlético" },
] as const;

export function equipoDelFiltro(valor?: string | string[]) {
  return typeof valor === "string" ? EQUIPOS_ANALISIS.find((e) => String(e.id) === valor) : undefined;
}

export function equipoDelArticulo(articulo: Pick<Vinculo, "team_id" | "title">): number | null {
  if (articulo.team_id != null) return articulo.team_id;
  // Mirar prefijos respeta el orden de mención cuando el título cita a varios.
  const palabras = articulo.title.split(/\s+/);
  for (let i = 1; i <= palabras.length; i++) {
    const prefijo = palabras.slice(0, i).join(" ");
    const equipo = EQUIPOS_ANALISIS.find((e) => nombraEquipo(prefijo, e.nombre));
    if (equipo) return equipo.id;
  }
  return null;
}
