import Link from "next/link";
import { porEquipo, type Articulo } from "@/lib/analisis/queries";
import { EQUIPOS_ANALISIS, equipoDelArticulo } from "@/lib/analisis/equipo";
import { getCompetitionStandings, type StandingRow } from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { equiposEnEspanol } from "@/lib/sports/nombres";

async function cargar(articulo: Articulo) {
  try {
    const id = equipoDelArticulo(articulo);
    if (id == null) return null;
    const principal = EQUIPOS_ANALISIS.find((e) => e.id === id);
    const tabla = principal ? [] : equiposEnEspanol(await getCompetitionStandings(COMPETITIONS_BY_SLUG.laliga)) as StandingRow[] | null;
    const nombre = principal?.nombre ?? tabla?.find((r) => r.team.id === id)?.team.name ?? "";
    const otros = (await porEquipo(id, nombre, [], 4)).filter((a) => a.id !== articulo.id).slice(0, 3);
    return otros.length ? { otros, de: principal?.de ?? `del ${nombre || "equipo"}` } : null;
  } catch {
    return null;
  }
}

export default async function MasAnalisisEquipo({ articulo }: { articulo: Articulo }) {
  const datos = await cargar(articulo);
  if (!datos) return null;
  return (
    <section className="analisis-relacionados" aria-labelledby="mas-analisis-titulo">
      <h2 id="mas-analisis-titulo">Más análisis {datos.de}</h2>
      <ul>
        {datos.otros.map((a) => <li key={a.id}><Link href={`/analisis/${a.slug}`}>{a.title} →</Link></li>)}
      </ul>
    </section>
  );
}
