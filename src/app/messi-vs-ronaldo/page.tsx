import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import GoatsCard from "@/components/GoatsCard";
import CompartirImagen from "@/components/CompartirImagen";
import {
  competicionEs,
  getFixturePlayers,
  getTeamFixtures,
  getTemporadaJugador,
  isFinal,
  type Fixture,
  type FilaTemporada,
} from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";

export const metadata: Metadata = {
  title: "Messi vs Ronaldo: goles, asistencias y partidos, actualizado | Soy Reinaldo",
  description:
    "La comparativa Messi vs Cristiano Ronaldo al día: goles, asistencias y partidos de carrera, esta temporada por competición, sus próximos partidos y lo que hicieron en los últimos.",
  alternates: { canonical: "/messi-vs-ronaldo" },
};

/**
 * Página de Messi vs Ronaldo (13-oct-2026, pedido del dueño): la comparativa
 * de carrera (la misma del cuadro de la portada), su temporada por
 * competición, sus próximos partidos y lo que hicieron en los últimos. Todo
 * de caché y del archivo: la temporada la refresca el cron `goats` tras
 * cada partido; los partidos son los mismos que ya consulta ese cron.
 */
const GOATS = [
  // Messi ya no va con Argentina (se retiró de la selección, 13-oct-2026):
  // sus partidos pasados con ella siguen en "últimos", pero no en "próximos".
  { clave: "messi", nombre: "Messi", apiId: 154, season: 2026, equipos: [9568, 26], sinFuturo: [26] },
  { clave: "ronaldo", nombre: "Cristiano", apiId: 874, season: 2026, equipos: [2939, 27], sinFuturo: [] },
] as const;

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function enlacePartido(f: Fixture): string | null {
  const c = COMPETITIONS.find((x) => x.leagueId === f.league.id);
  return c ? `/liga/${c.slug}/partido/${f.fixture.id}` : null;
}

async function partidosDe(equipos: readonly number[], sinFuturo: readonly number[]) {
  const r = await Promise.all(
    equipos.map((e) => getTeamFixtures(e, { last: 5, next: 3, revalidate: 3600 }).catch(() => null)),
  );
  return {
    proximos: r
      .filter((_, i) => !sinFuturo.includes(equipos[i]))
      .flatMap((x) => x?.upcoming ?? []),
    ultimos: r.flatMap((x) => x?.recent ?? []).filter(isFinal),
  };
}

export default async function MessiVsRonaldoPage() {
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap" style={{ display: "grid", gap: 28 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Suspense fallback={null}>
              <GoatsCard />
            </Suspense>
            <CompartirImagen
              imagen="/messi-vs-ronaldo/imagen"
              nombreArchivo="messi-vs-cristiano.png"
              url="https://www.soyreinaldo.com/messi-vs-ronaldo"
              texto="Messi vs Cristiano, al día 🐐"
            />
          </div>
          <Suspense fallback={null}>
            <Detalle />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Detalle() {
  const datos = await Promise.all(
    GOATS.map(async (g) => {
      const [temporada, partidos] = await Promise.all([
        getTemporadaJugador(g.apiId, g.season).catch(() => [] as FilaTemporada[]),
        partidosDe(g.equipos, g.sinFuturo),
      ]);
      return { g, temporada, ...partidos };
    }),
  );

  // Próximos partidos de los dos, juntos y en orden.
  const proximos = datos
    .flatMap((d) => d.proximos.map((f) => ({ f, quien: d.g.nombre })))
    .sort((a, b) => Date.parse(a.f.fixture.date) - Date.parse(b.f.fixture.date))
    .slice(0, 8);

  // Últimos partidos con lo que hizo cada uno (el partido terminado está en
  // el archivo: leerlo no gasta cuota).
  const ultimos = (
    await Promise.all(
      datos.flatMap((d) =>
        d.ultimos
          .sort((a, b) => Date.parse(b.fixture.date) - Date.parse(a.fixture.date))
          .slice(0, 4)
          .map(async (f) => {
            const eq = await getFixturePlayers(f.fixture.id, 3600).catch(() => []);
            const p = eq.flatMap((t) => t.players).find((x) => x.id === d.g.apiId);
            return { f, quien: d.g.nombre, p, conDatos: eq.length > 0 };
          }),
      ),
    )
  ).sort((a, b) => Date.parse(b.f.fixture.date) - Date.parse(a.f.fixture.date));

  return (
    <>
      <div>
        <div className="shead">
          <h2>📊 Esta temporada</h2>
          <span className="sh-note">por competición</span>
        </div>
        <div className="grid2" style={{ alignItems: "start" }}>
          {datos.map((d) => (
            <div key={d.g.clave} className="panel" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Image
                  src={`https://media.api-sports.io/football/players/${d.g.apiId}.png`}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  style={{ borderRadius: "50%" }}
                />
                <b style={{ fontSize: "1.1rem" }}>{d.g.nombre}</b>
              </div>
              {d.temporada.length === 0 ? (
                <p style={{ color: "var(--text-dim)", margin: 0 }}>Sin datos de esta temporada todavía.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ color: "var(--text-dim)", fontSize: "0.72rem", textAlign: "right" }}>
                      <th style={{ textAlign: "left", fontWeight: 600, paddingBottom: 6 }}>Competición</th>
                      <th style={{ fontWeight: 600 }}>PJ</th>
                      <th style={{ fontWeight: 600 }}>G</th>
                      <th style={{ fontWeight: 600 }}>A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.temporada.map((t) => (
                      <tr key={`${t.competicion}-${t.equipo}`} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={{ padding: "7px 0" }}>
                          {t.competicion}
                          <br />
                          <small style={{ color: "var(--text-dim)" }}>{t.equipo}</small>
                        </td>
                        <td style={{ textAlign: "right" }}>{t.partidos}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{t.goles}</td>
                        <td style={{ textAlign: "right" }}>{t.asistencias}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </div>

      {proximos.length > 0 && (
        <div>
          <div className="shead">
            <h2>📅 Próximos partidos</h2>
          </div>
          <div className="panel" style={{ padding: "6px 18px" }}>
            {proximos.map(({ f, quien }) => {
              const url = enlacePartido(f);
              const fila = (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 0",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <span className="mono" style={{ fontSize: "0.72rem", color: "var(--accent-2)" }}>{quien}</span>
                  <span>
                    {f.teams.home.name} – {f.teams.away.name}
                    <br />
                    <small style={{ color: "var(--text-dim)" }}>{competicionEs(f.league.name)}</small>
                  </span>
                  <span className="mono" style={{ fontSize: "0.74rem", color: "var(--text-dim)", textAlign: "right" }}>
                    {fecha(f.fixture.date)}
                  </span>
                </div>
              );
              return url ? (
                <Link key={`${quien}-${f.fixture.id}`} href={url} style={{ color: "inherit", textDecoration: "none" }}>
                  {fila}
                </Link>
              ) : (
                <div key={`${quien}-${f.fixture.id}`}>{fila}</div>
              );
            })}
          </div>
        </div>
      )}

      {ultimos.length > 0 && (
        <div>
          <div className="shead">
            <h2>⚽ Sus últimos partidos</h2>
          </div>
          <div className="panel" style={{ padding: "6px 18px" }}>
            {ultimos.map(({ f, quien, p, conDatos }) => {
              const jugo = (p?.minutes ?? 0) > 0;
              const url = enlacePartido(f);
              const fila = (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 0",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <span className="mono" style={{ fontSize: "0.72rem", color: "var(--accent-2)" }}>{quien}</span>
                  <span>
                    {f.teams.home.name} {f.goals.home}–{f.goals.away} {f.teams.away.name}
                    <br />
                    <small style={{ color: "var(--text-dim)" }}>
                      {competicionEs(f.league.name)} · {fecha(f.fixture.date)}
                    </small>
                  </span>
                  <span style={{ textAlign: "right", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {jugo ? (
                      <>
                        {p!.minutes}&apos;
                        {p!.goals > 0 && <> · ⚽{p!.goals}</>}
                        {p!.assists > 0 && <> · 🅰️{p!.assists}</>}
                        {p!.rating != null && (
                          <>
                            {" · "}
                            <b style={{ color: "var(--accent-2)" }}>{p!.rating.toFixed(1)}</b>
                          </>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>{conDatos ? "No jugó" : "Sin datos"}</span>
                    )}
                  </span>
                </div>
              );
              return url ? (
                <Link key={`${quien}-${f.fixture.id}`} href={url} style={{ color: "inherit", textDecoration: "none" }}>
                  {fila}
                </Link>
              ) : (
                <div key={`${quien}-${f.fixture.id}`}>{fila}</div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
