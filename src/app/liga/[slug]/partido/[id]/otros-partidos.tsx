import Image from "next/image";
import Link from "next/link";
import {
  allFixturesCacheKey,
  isFinal,
  isLive,
  type Fixture,
} from "@/lib/sports/api-football";
import { readCache } from "@/lib/sports/sports-cache";
import type { Competition } from "@/lib/sports/competitions";

const MAX = 8;
const HORA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** De los partidos de la jornada, los que se enseñan: si son más de `MAX`
 * (la fase liga de la Champions tiene 18), los más cercanos en el tiempo al
 * que se está viendo, y luego en orden de fecha. Exportada para el test. */
export function elegirOtros(todos: Fixture[], actual: { id: number; round: string; date: string }): Fixture[] {
  const t0 = Date.parse(actual.date);
  return todos
    .filter((f) => f.league.round === actual.round && f.fixture.id !== actual.id)
    .sort((a, b) => Math.abs(Date.parse(a.fixture.date) - t0) - Math.abs(Date.parse(b.fixture.date) - t0))
    .slice(0, MAX)
    .sort((a, b) => Date.parse(a.fixture.date) - Date.parse(b.fixture.date) || a.fixture.id - b.fixture.id);
}

/**
 * «Más partidos de la jornada» en la ficha de partido (26-nov-2026). Quien
 * entra a un partido casi nunca pasaba a otro: este bloque lo pone a un toque.
 * Sale del calendario precalculado (`sports_cache`), sin llamadas a
 * API-Football. Ese calendario puede ir hasta 10 min por detrás, así que de
 * un partido en juego no se enseña el marcador (podría estar viejo): solo
 * «En juego».
 */
export default async function OtrosPartidos({
  competition,
  actual,
}: {
  competition: Competition;
  actual: { id: number; round: string | null; date: string };
}) {
  if (!actual.round) return null;
  const todos = (await readCache<Fixture[]>(allFixturesCacheKey(competition), 7 * 86_400)) ?? [];
  const otros = elegirOtros(todos, { ...actual, round: actual.round });
  if (otros.length === 0) return null;

  return (
    <nav className="panel otrosp" aria-label="Más partidos de la jornada">
      <p className="masr__cab">Más partidos de la jornada</p>
      {otros.map((f) => {
        const vivo = isLive(f);
        const final = isFinal(f);
        const centro = final
          ? `${f.goals.home ?? 0} - ${f.goals.away ?? 0}`
          : vivo
            ? "En juego"
            : HORA.format(new Date(f.fixture.date));
        return (
          <Link key={f.fixture.id} href={`/liga/${competition.slug}/partido/${f.fixture.id}`} className="otrosp__fila">
            <span className="otrosp__eq otrosp__eq--local">
              <span className="otrosp__nom">{f.teams.home.name}</span>
              <Image src={f.teams.home.logo} alt="" width={20} height={20} unoptimized />
            </span>
            <span className={`otrosp__centro${vivo ? " is-vivo" : ""}${final ? " is-final" : ""}`}>{centro}</span>
            <span className="otrosp__eq">
              <Image src={f.teams.away.logo} alt="" width={20} height={20} unoptimized />
              <span className="otrosp__nom">{f.teams.away.name}</span>
            </span>
          </Link>
        );
      })}
      <Link href={`/liga/${competition.slug}`} className="otrosp__todo">
        Ver toda la competición →
      </Link>
    </nav>
  );
}
