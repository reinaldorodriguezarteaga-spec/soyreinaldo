import { Star, CalendarDays } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getCompetitionStandings,
  getTeamFixtures,
  isFinal,
  isLive,
  type Fixture,
  type StandingRow,
} from "@/lib/sports/api-football";
import { COMPETITIONS, COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { equiposEnEspanol } from "@/lib/sports/nombres";
import MiEquipoElegir from "@/components/MiEquipoElegir";
import CuentaAtras from "@/components/CuentaAtras";
import CalendarioBotones from "@/components/CalendarioBotones";
import OfertaAvisos from "@/components/OfertaAvisos";

/**
 * "Mi equipo" en lo alto de la portada (16-oct, pedido del dueño): próximo
 * partido con cuenta atrás, último resultado y puesto en su liga.
 *
 * Partidos: `getTeamFixtures` con la misma combinación que precalcula el cron
 * para los equipos destacados (last 20 / next 4), así que esos no gastan
 * nada; el resto cae a la llamada con caché de 30 min por equipo, como la
 * ficha del equipo. El puesto sale de la clasificación ya cacheada.
 *
 * Sin sesión o sin equipos favoritos no pinta nada (eso lo pide el selector
 * de favoritos). Con favoritos pero sin principal, pregunta cuál es.
 */

type Fav = { ref_id: string; label: string | null };

/** Partido "en juego" según el calendario cacheado (30 min de caché: el
 * marcador exacto está en la ficha). */
const DURACION_MS = 2 * 3_600_000;

function slugDe(f: Fixture, porDefecto: string | null): string | null {
  return COMPETITIONS.find((c) => c.leagueId === f.league.id)?.slug ?? porDefecto;
}

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export default async function MiEquipoCard() {
  let datos: Awaited<ReturnType<typeof cargar>> = null;
  try {
    datos = await cargar();
  } catch {
    return null;
  }
  if (!datos) return null;

  if (datos.tipo === "elegir") {
    return (
      <section className="panel miequipo">
        <p className="mono miequipo__eyebrow"><Star className="ico-txt" aria-hidden /> Mi equipo</p>
        <h2 className="miequipo__pregunta">¿Cuál es tu equipo?</h2>
        <p className="miequipo__sub">
          Lo tendrás aquí arriba: su próximo partido, el último resultado y cómo va en la tabla.
        </p>
        <MiEquipoElegir equipos={datos.equipos} />
      </section>
    );
  }

  return <MiEquipoVista datos={datos} />;
}

type DatosEquipo = Awaited<ReturnType<typeof datosEquipo>>;

export function MiEquipoVista({
  datos,
}: {
  datos: DatosEquipo & { calendario?: string | null };
}) {
  const { equipo, liga, proximo, enJuego, ultimo, fila, equipos, calendario } = datos;
  // Suscripción al calendario de sus equipos (se actualiza sola).
  const ics = calendario ?? null;

  return (
    <section className="panel miequipo">
      <header className="miequipo__cab">
        <Link href={`/liga/${liga}/equipo/${equipo.id}`} className="miequipo__equipo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={equipo.logo} alt="" width={40} height={40} />
          <span>
            <span className="mono miequipo__eyebrow"><Star className="ico-txt" aria-hidden /> Mi equipo</span>
            <strong>{equipo.name}</strong>
          </span>
        </Link>
        {fila && (
          <Link href={`/liga/${liga}`} className="miequipo__puesto">
            <strong>{fila.rank}º</strong>
            <span className="mono">
              <span className="miequipo__liga">{COMPETITIONS_BY_SLUG[liga]?.name ?? ""} · </span>
              {fila.points} pts
            </span>
          </Link>
        )}
      </header>

      <div className="miequipo__filas">
        {proximo && (
          <Link
            href={`/liga/${slugDe(proximo, liga)}/partido/${proximo.fixture.id}`}
            className={`miequipo__fila${enJuego ? " vivo" : ""}`}
          >
            <span className="mono miequipo__etq">{enJuego ? "● En juego" : "Próximo"}</span>
            <span className="miequipo__partido">
              {proximo.teams.home.name} – {proximo.teams.away.name}
            </span>
            <span className="mono miequipo__cuando">
              {enJuego ? (
                "Ver en directo →"
              ) : (
                <>
                  {fecha(proximo.fixture.date)}
                  <CuentaAtras iso={proximo.fixture.date} />
                </>
              )}
            </span>
          </Link>
        )}
        {ultimo && (
          <Link
            href={`/liga/${slugDe(ultimo, liga)}/partido/${ultimo.fixture.id}`}
            className="miequipo__fila"
          >
            <span className="mono miequipo__etq">Último</span>
            <span className="miequipo__partido">
              {ultimo.teams.home.name} {ultimo.goals.home}–{ultimo.goals.away}{" "}
              {ultimo.teams.away.name}
            </span>
            <Resultado f={ultimo} equipoId={equipo.id} />
          </Link>
        )}
      </div>

      <OfertaAvisos
        clave="mi-equipo"
        texto={`¿Te avisamos cuando juegue y cuando marque el ${equipo.name}?`}
      />

      <div className="miequipo__pie">
        {ics && (
          <details className="miequipo__cambiar">
            <summary className="mono"><CalendarDays className="ico-txt" aria-hidden /> Partidos en mi calendario</summary>
            <p className="miequipo__sub">
              Todos los partidos de tus equipos favoritos, con hora y resultado. Se actualiza solo.
            </p>
            <CalendarioBotones token={ics} />
          </details>
        )}
        {equipos.length > 1 && (
          <details className="miequipo__cambiar">
            <summary className="mono">Cambiar de equipo</summary>
            <MiEquipoElegir equipos={equipos} actual={equipo.id} />
          </details>
        )}
      </div>
    </section>
  );
}

function Resultado({ f, equipoId }: { f: Fixture; equipoId: number }) {
  const mios = f.teams.home.id === equipoId ? f.goals.home : f.goals.away;
  const suyos = f.teams.home.id === equipoId ? f.goals.away : f.goals.home;
  if (mios == null || suyos == null) return null;
  const [letra, clase] =
    mios > suyos ? ["V", "v"] : mios < suyos ? ["D", "d"] : ["E", "e"];
  return <span className={`miequipo__res miequipo__res--${clase}`}>{letra}</span>;
}

async function cargar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: perfil }, { data: favs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("mi_equipo_id, mi_equipo_liga, calendario_token")
      .eq("id", user.id)
      .maybeSingle<{
        mi_equipo_id: number | null;
        mi_equipo_liga: string | null;
        calendario_token: string | null;
      }>(),
    supabase
      .from("user_favorites")
      .select("ref_id, label")
      .eq("user_id", user.id)
      .eq("kind", "team")
      .order("created_at")
      .returns<Fav[]>(),
  ]);
  const equipos = (favs ?? [])
    .map((f) => ({ id: Number(f.ref_id), name: f.label ?? "" }))
    .filter((e) => Number.isInteger(e.id) && e.id > 0);
  if (equipos.length === 0) return null;

  const id = perfil?.mi_equipo_id ?? null;
  if (!id || !equipos.some((e) => e.id === id)) {
    return { tipo: "elegir" as const, equipos };
  }

  return {
    ...(await datosEquipo(id, perfil?.mi_equipo_liga ?? null, equipos)),
    calendario: perfil?.calendario_token ?? null,
  };
}

/** Partidos, puesto y escudo del equipo principal. */
export async function datosEquipo(
  id: number,
  ligaGuardada: string | null,
  equipos: { id: number; name: string }[],
) {
  const liga = ligaGuardada && COMPETITIONS_BY_SLUG[ligaGuardada] ? ligaGuardada : "laliga";
  const comp = COMPETITIONS_BY_SLUG[liga];

  const [partidos, tabla] = await Promise.all([
    getTeamFixtures(id, { last: 20, next: 4 }),
    comp.standingsMode === "table"
      ? getCompetitionStandings(comp).catch(() => null)
      : Promise.resolve(null),
  ]);
  const { recent, upcoming, team } = equiposEnEspanol(partidos);
  const fila =
    (equiposEnEspanol((tabla ?? []) as StandingRow[]) as StandingRow[]).find(
      (r) => r.team.id === id,
    ) ?? null;

  // El partido en juego no está ni en "últimos" (sin terminar) ni siempre en
  // "próximos": se busca primero entre los últimos sin final.
  const vivo = recent.find((f) => !isFinal(f) && isLive(f)) ?? null;
  const proximo = vivo ?? upcoming[0] ?? null;
  const ultimo = recent.find((f) => isFinal(f)) ?? null;
  const fav = equipos.find((e) => e.id === id);
  const ahora = Date.now();
  const inicio = proximo ? new Date(proximo.fixture.date).getTime() : 0;
  const enJuego =
    !!proximo && (isLive(proximo) || (inicio <= ahora && inicio + DURACION_MS > ahora));

  return {
    tipo: "equipo" as const,
    equipo: {
      id,
      name: team?.name ?? fav?.name ?? "",
      logo: team?.logo ?? `https://media.api-sports.io/football/teams/${id}.png`,
    },
    liga,
    proximo,
    enJuego,
    ultimo,
    fila,
    equipos,
  };
}
