import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import {
  getFixtureLineups,
  getTeamFixtures,
  getTeamSquad,
  type Fixture,
  type SquadPlayer,
} from "@/lib/sports/api-football";
import { equiposEnEspanol, nombreCorto } from "@/lib/sports/nombres";
import { FORMACIONES } from "@/lib/pizarra/formaciones";
import { EQUIPO_ONCE, TEMPORADA_DESDE, cerrado, puntuarPendientes } from "@/lib/juegos/adivina-once";
import Formulario, { type JugadorOnce } from "./formulario";

export const metadata: Metadata = {
  title: "Adivina el once del Barça | Juegos · Soy Reinaldo",
  description:
    "Antes de cada partido del Barça, apuesta el once titular. Un punto por cada acierto, premio por clavar la formación y clasificación de la temporada.",
  alternates: { canonical: "/juegos/adivina-el-once" },
};

const GRUPO: Record<string, JugadorOnce["grupo"]> = { Goalkeeper: "POR", Defender: "DEF", Midfielder: "MED", Attacker: "DEL" };
type Prediccion = { fixture_id: number; formacion: string; jugadores: number[]; aciertos: number | null; formacion_ok: boolean | null; puntos: number | null };

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(iso));

function Partido({ f }: { f: Fixture }) {
  return (
    <div className="ao-partido">
      {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
      <img src={f.teams.home.logo} alt="" width={36} height={36} />
      <div>
        <b>
          {f.teams.home.name} – {f.teams.away.name}
        </b>
        <span>
          {f.league.name} · {fecha(f.fixture.date)}
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
      <img src={f.teams.away.logo} alt="" width={36} height={36} />
    </div>
  );
}

export default async function AdivinaElOncePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    calendario,
    plantillaApi,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getTeamFixtures(EQUIPO_ONCE, { last: 1, next: 1 }).catch(() => ({ recent: [] as Fixture[], upcoming: [] as Fixture[] })),
    getTeamSquad(EQUIPO_ONCE).catch(() => [] as SquadPlayer[]),
  ]);
  const proximo = calendario.upcoming[0] ? equiposEnEspanol(calendario.upcoming[0]) : null;
  const anterior = calendario.recent[0] ? equiposEnEspanol(calendario.recent[0]) : null;

  // Puntúa lo pendiente después de responder (no retrasa la página).
  const db = clienteServicio();
  if (db) after(() => puntuarPendientes(db).then(() => undefined).catch(() => undefined));

  const ids = [proximo?.fixture.id, anterior?.fixture.id].filter((x): x is number => !!x);
  const { data: mias } = user
    ? await supabase
        .from("once_predicciones")
        .select("fixture_id, formacion, jugadores, aciertos, formacion_ok, puntos")
        .eq("user_id", user.id)
        .eq("team_id", EQUIPO_ONCE)
        .in("fixture_id", ids.length ? ids : [0])
        .returns<Prediccion[]>()
    : { data: [] as Prediccion[] };
  const mia = (id: number | undefined) => (mias ?? []).find((p) => p.fixture_id === id) ?? null;

  const [clasif, masElegidos, alineacionAnterior] = await Promise.all([
    supabase.rpc("once_clasificacion", { p_team: EQUIPO_ONCE, p_desde: TEMPORADA_DESDE, p_limite: 20 }),
    proximo && cerrado(new Date(proximo.fixture.date))
      ? supabase.rpc("once_mas_elegidos", { p_fixture: proximo.fixture.id, p_team: EQUIPO_ONCE })
      : Promise.resolve({ data: null }),
    anterior && mia(anterior.fixture.id) ? getFixtureLineups(anterior.fixture.id).catch(() => []) : Promise.resolve([]),
  ]);

  const plantilla: JugadorOnce[] = plantillaApi
    .filter((j) => j.position && GRUPO[j.position])
    .map((j) => ({ id: j.id, nombre: nombreCorto(j.name), dorsal: j.number, foto: j.photo, grupo: GRUPO[j.position!] }))
    .sort((a, b) => (a.dorsal ?? 99) - (b.dorsal ?? 99));
  const nombreDe = (id: number) => plantilla.find((j) => j.id === id)?.nombre ?? `#${id}`;

  const abierto = proximo && !cerrado(new Date(proximo.fixture.date)) && proximo.fixture.status.short === "NS";
  const miProximo = mia(proximo?.fixture.id);
  const miAnterior = mia(anterior?.fixture.id);
  const realAnterior = alineacionAnterior.find((l) => l.teamId === EQUIPO_ONCE);
  const titularesAnterior = new Set(realAnterior?.startXI.map((p) => p.id) ?? []);
  const filas = (clasif.data ?? []) as { user_id: string; nombre: string; puntos: number; partidos: number; aciertos: number }[];
  const elegidos = (masElegidos.data ?? []) as { jugador: number; veces: number; total: number }[];

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Adivina el once
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Adivina el once
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 680 }}>
            Antes de cada partido del Barça, apuesta el once titular. Un punto por cada titular que aciertes, otro si
            clavas la formación y tres más de premio si haces pleno. Se cierra una hora antes, cuando sale la alineación.
          </p>

          <div className="ao-cuerpo">
            <div>
              {proximo ? (
                <div className="panel ao-panel">
                  <h2 className="ao-tit">Próximo partido</h2>
                  <Partido f={proximo} />
                  {!abierto ? (
                    <>
                      <p className="pz-ayuda">Cerrado: ya no se puede cambiar el once.</p>
                      {miProximo && (
                        <p className="ao-mio">
                          <b>Tu once ({miProximo.formacion}):</b> {miProximo.jugadores.map(nombreDe).join(", ")}
                        </p>
                      )}
                    </>
                  ) : !user ? (
                    <p style={{ margin: "12px 0 0" }}>
                      <Link href="/login?next=/juegos/adivina-el-once" className="btn btn--accent">
                        Entra para jugar
                      </Link>
                    </p>
                  ) : plantilla.length < 11 ? (
                    <p className="pz-ayuda">No se pudo cargar la plantilla. Prueba en un rato.</p>
                  ) : (
                    <Formulario
                      fixture={proximo.fixture.id}
                      plantilla={plantilla}
                      formaciones={FORMACIONES}
                      inicial={miProximo && { formacion: miProximo.formacion, jugadores: miProximo.jugadores }}
                    />
                  )}
                </div>
              ) : (
                <div className="panel ao-panel">
                  <p className="pz-ayuda">No hay partidos del Barça a la vista. Vuelve pronto.</p>
                </div>
              )}

              {elegidos.length > 0 && (
                <div className="panel ao-panel">
                  <h2 className="ao-tit">Los más elegidos por la afición</h2>
                  <p className="pz-ayuda" style={{ marginTop: 0 }}>
                    {elegidos[0].total} {elegidos[0].total === 1 ? "once enviado" : "onces enviados"}
                  </p>
                  <ul className="ao-barras">
                    {elegidos.slice(0, 14).map((e) => (
                      <li key={e.jugador}>
                        <span>{nombreDe(e.jugador)}</span>
                        <span className="ao-barra">
                          <i style={{ width: `${Math.round((e.veces / e.total) * 100)}%` }} />
                        </span>
                        <b>{Math.round((e.veces / e.total) * 100)}%</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {anterior && miAnterior && (
                <div className="panel ao-panel">
                  <h2 className="ao-tit">Tu último once</h2>
                  <Partido f={anterior} />
                  {miAnterior.puntos != null ? (
                    <p className="ao-res">
                      <b>{miAnterior.puntos} puntos</b> · {miAnterior.aciertos}/11 titulares
                      {miAnterior.formacion_ok ? " · formación clavada" : ""}
                    </p>
                  ) : (
                    <p className="pz-ayuda">Aún sin puntuar: en cuanto esté la alineación oficial.</p>
                  )}
                  <ul className="ao-chips">
                    {miAnterior.jugadores.map((id) => (
                      <li key={id} className={titularesAnterior.size ? (titularesAnterior.has(id) ? "is-ok" : "is-mal") : ""}>
                        {nombreDe(id)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="panel ao-panel">
              <h2 className="ao-tit">Clasificación de la temporada</h2>
              {filas.length === 0 ? (
                <p className="pz-ayuda">Aún no hay partidos puntuados. ¡El primero se lleva la cima!</p>
              ) : (
                <ol className="ao-clasif">
                  {filas.map((f, i) => (
                    <li key={f.user_id} className={f.user_id === user?.id ? "is-yo" : ""}>
                      <span className="ao-clasif__pos">{i + 1}</span>
                      <span className="ao-clasif__n">{f.nombre}</span>
                      <span className="ao-clasif__p">
                        {f.partidos} PJ · <b>{f.puntos}</b>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
