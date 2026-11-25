import Link from "next/link";
import { Vote } from "lucide-react";
import Icono from "@/components/Icono";
import EncuestaCard from "@/components/EncuestaCard";
import { cargarEncuestas } from "@/lib/encuestas";
import { getTeamFixtures, isFinal, isLive, type Fixture } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { equiposEnEspanol } from "@/lib/sports/nombres";

/**
 * «Opina» en la portada (25-nov-2026, pedido del dueño): las encuestas del
 * último partido del Barça (la del mejor del partido, que crea sola la ficha,
 * y las que lance el admin en directo), para votar de un toque sin entrar en
 * la ficha. Hasta hoy vivían solo allí: 1.022 encuestas y 7 votos.
 *
 * Partidos: la misma combinación de `getTeamFixtures` que precalcula el cron
 * para los equipos destacados (last 20 / next 4), así que no gasta cuota.
 */
const BARCA = 529;
const VENTANA_MS = 7 * 24 * 3_600_000;
const MAX = 2;

/** En juego, o terminados en la última semana (como la encuesta del MVP). */
function partidosConEncuesta(recent: Fixture[], upcoming: Fixture[]): Fixture[] {
  const ahora = Date.now();
  return [
    ...upcoming.filter((f) => isLive(f)),
    ...recent.filter((f) => isFinal(f) && ahora - Date.parse(f.fixture.date) < VENTANA_MS).slice(0, 2),
  ];
}

export default async function HomeEncuestas() {
  let recent: Fixture[] = [];
  let upcoming: Fixture[] = [];
  try {
    ({ recent, upcoming } = equiposEnEspanol(await getTeamFixtures(BARCA, { last: 20, next: 4 })));
  } catch {
    return null;
  }
  const partidos = partidosConEncuesta(recent, upcoming);
  if (partidos.length === 0) return null;

  const { encuestas, conSesion, esAdmin } = await cargarEncuestas(partidos.map((f) => f.fixture.id));
  const porPartido = new Map(partidos.map((f, i) => [f.fixture.id, i]));
  // Primero las del partido más reciente; dentro de cada uno, las abiertas.
  const elegidas = encuestas
    .sort(
      (a, b) =>
        (porPartido.get(a.fixture_id) ?? 9) - (porPartido.get(b.fixture_id) ?? 9) ||
        Number(a.cerrada) - Number(b.cerrada),
    )
    .slice(0, MAX);
  if (elegidas.length === 0) return null;

  const partido = partidos[porPartido.get(elegidas[0].fixture_id) ?? 0];
  const slug = COMPETITIONS.find((c) => c.leagueId === partido.league.id)?.slug ?? "laliga";
  const { home, away } = partido.teams;
  const marcador =
    partido.goals.home != null && partido.goals.away != null
      ? `${home.name} ${partido.goals.home}-${partido.goals.away} ${away.name}`
      : `${home.name} - ${away.name}`;

  return (
    <section className="panel homeopina" aria-labelledby="opina-titulo">
      <header className="homeopina__cab">
        <Icono icono={Vote} tono="azul" tam="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="opina-titulo" className="homeopina__titulo">Opina</h2>
          <Link href={`/liga/${slug}/partido/${partido.fixture.id}`} className="mono homeopina__partido">
            {marcador} →
          </Link>
        </div>
      </header>
      <div className="encuestas homeopina__lista">
        {elegidas.map((e) => (
          <EncuestaCard key={e.id} {...e} conSesion={conSesion} esAdmin={esAdmin} />
        ))}
      </div>
    </section>
  );
}
