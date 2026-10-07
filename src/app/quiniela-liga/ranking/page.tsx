import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyClubLeagues, pickLeague, leagueHref } from "@/lib/quiniela-liga/leagues";
import LeagueSwitcher from "../league-switcher";
import { getBaremoPublico } from "@/lib/quiniela-liga/baremo";
import { textoBaremo } from "@/lib/quiniela-liga/league-utils";
import { ANFITRION_ID, ANFITRION_NOMBRE } from "@/lib/quiniela-liga/anfitrion";

/** Liga pública "Quiniela LaLiga 2026-27": lo que ve quien no ha entrado. */
const PUBLIC_LEAGUE_ID = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";

export const metadata = {
  title: "Clasificación · Quiniela LaLiga 2026-27 | Soy Reinaldo",
};

type FilaJornada = {
  user_id: string;
  display_name: string;
  puntos: number;
  exactos: number;
  aciertos: number;
  jugados: number;
};

/** Enlace a esta misma página conservando la liga activa. */
function hrefRanking(base: string, extra: Record<string, string>): string {
  const [ruta, qs] = base.split("?");
  const params = new URLSearchParams(qs ?? "");
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const q = params.toString();
  return q ? `${ruta}?${q}` : ruta;
}

type Row = {
  user_id: string;
  display_name: string;
  prediction_points: number;
  adjustment_points: number;
  total_points: number;
  exact_count: number;
  partial_count: number;
  predictions_made: number;
};

export default async function QuinielaLigaRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; vista?: string; j?: string }>;
}) {
  const { liga, vista, j } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const leagues = user ? await getMyClubLeagues(user.id) : [];
  const active = pickLeague(leagues, liga);
  const leagueId = active?.id ?? PUBLIC_LEAGUE_ID;

  const baremo = await getBaremoPublico();

  const { data } = await supabase.rpc("lq_leaderboard", {
    p_league_id: leagueId,
  });
  const rows = (data ?? []) as Row[];
  const meId = user?.id ?? null;

  // Estado de cada jornada (los aplazados no cuentan): cuáles están
  // terminadas del todo y cuáles tienen ya algún partido jugado.
  const { data: partidos } = await supabase
    .from("lq_matches")
    .select("matchday, finished, status")
    .eq("counts_for_scoring", true)
    .lte("kickoff_at", new Date().toISOString())
    .returns<{ matchday: number; finished: boolean; status: string | null }[]>();
  const porJornada = new Map<number, { total: number; fin: number }>();
  for (const m of partidos ?? []) {
    if (m.status === "PST") continue;
    const acc = porJornada.get(m.matchday) ?? { total: 0, fin: 0 };
    acc.total += 1;
    if (m.finished) acc.fin += 1;
    porJornada.set(m.matchday, acc);
  }
  const conPartidos = [...porJornada.entries()].filter(([, v]) => v.fin > 0).map(([n]) => n);
  const terminadas = [...porJornada.entries()]
    .filter(([, v]) => v.total > 0 && v.fin === v.total)
    .map(([n]) => n);
  const ultimaTerminada = terminadas.length ? Math.max(...terminadas) : null;
  const ultimaConPartidos = conPartidos.length ? Math.max(...conPartidos) : null;

  // Pestaña "Jornada": la pedida en ?j=, o la más reciente con partidos.
  const enVistaJornada = vista === "jornada" && ultimaConPartidos != null;
  const pedida = Number(j);
  const jornadaVista =
    Number.isInteger(pedida) && conPartidos.includes(pedida) ? pedida : ultimaConPartidos;
  const jornadaCompleta = jornadaVista != null && terminadas.includes(jornadaVista);

  const [{ data: filasJornadaData }, { data: ganadoresData }] = await Promise.all([
    enVistaJornada && jornadaVista != null
      ? supabase.rpc("lq_ranking_jornada", { p_league_id: leagueId, p_matchday: jornadaVista })
      : Promise.resolve({ data: null }),
    // Ganador(es) de la última jornada terminada: distintivo en la general.
    ultimaTerminada != null
      ? supabase.rpc("lq_ranking_jornada", { p_league_id: leagueId, p_matchday: ultimaTerminada })
      : Promise.resolve({ data: null }),
  ]);
  const filasJornada = (filasJornadaData ?? []) as FilaJornada[];
  const ganadoresUltima = (() => {
    const g = (ganadoresData ?? []) as FilaJornada[];
    const max = g[0]?.puntos ?? 0;
    return new Set(max > 0 ? g.filter((f) => f.puntos === max).map((f) => f.user_id) : []);
  })();
  const ganadoresVista = new Set(
    jornadaCompleta && filasJornada[0]?.puntos
      ? filasJornada.filter((f) => f.puntos === filasJornada[0].puntos).map((f) => f.user_id)
      : [],
  );

  // "¿Le ganas a Reinaldo?": diferencia con el anfitrión, si los dos juegan
  // en esta liga.
  const yo = rows.find((r) => r.user_id === meId);
  const anfitrion = rows.find((r) => r.user_id === ANFITRION_ID);
  const difAnfitrion =
    yo && anfitrion && meId !== ANFITRION_ID ? yo.total_points - anfitrion.total_points : null;

  // "Compartir mi jornada": la última terminada, si el usuario juega.
  let tarjeta: { href: string; jornada: number } | null = null;
  if (meId && yo && ultimaTerminada != null) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", meId)
      .maybeSingle<{ username: string | null }>();
    tarjeta = {
      jornada: ultimaTerminada,
      href: `/mi-jornada/${encodeURIComponent(perfil?.username || meId)}/${ultimaTerminada}`,
    };
  }

  const baseRanking = leagueHref("/quiniela-liga/ranking", active);

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <Link
            href={leagueHref("/quiniela-liga/partidos", active)}
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Pronósticos
          </Link>
          <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,4rem)", marginTop: 12 }}>
            Clasificación
          </h1>
          <p className="phero__lede" style={{ marginTop: 8 }}>
            {active && !active.isPublic ? `${active.name} · ` : ""}
            LaLiga 2026-27 · {textoBaremo(baremo)}.
          </p>
          {difAnfitrion != null && (
            <p
              className="panel"
              style={{ display: "inline-block", marginTop: 14, padding: "10px 14px" }}
            >
              🎙️{" "}
              {difAnfitrion > 0 ? (
                <>
                  Le sacas <strong>{difAnfitrion} {difAnfitrion === 1 ? "punto" : "puntos"}</strong> a{" "}
                  {ANFITRION_NOMBRE}. ¡Que no te pille!
                </>
              ) : difAnfitrion < 0 ? (
                <>
                  {ANFITRION_NOMBRE} te saca <strong>{-difAnfitrion} {difAnfitrion === -1 ? "punto" : "puntos"}</strong>. ¿Le ganas?
                </>
              ) : (
                <>Vas empatado con {ANFITRION_NOMBRE}. ¡Desempata!</>
              )}
            </p>
          )}
          {tarjeta && (
            <p style={{ marginTop: 12 }}>
              <Link href={tarjeta.href} className="btn btn--accent">
                Compartir mi jornada {tarjeta.jornada} <span className="arr">→</span>
              </Link>
            </p>
          )}
          {active && (!active.isPublic || active.role === "admin") && (
            <p style={{ marginTop: 12 }}>
              <Link
                href={`/quiniela-liga/liga/${encodeURIComponent(active.id)}`}
                className="btn"
              >
                {active.role === "admin" ? "Gestionar liga" : "Ver liga"}{" "}
                <span className="arr">→</span>
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <LeagueSwitcher
            leagues={leagues}
            active={active}
            basePath="/quiniela-liga/ranking"
          />
          {ultimaConPartidos != null && rows.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 14px" }}>
              <Link
                href={baseRanking}
                className={enVistaJornada ? "btn" : "btn btn--accent"}
                aria-current={enVistaJornada ? undefined : "page"}
              >
                General
              </Link>
              {[...conPartidos].sort((a, b) => b - a).slice(0, 6).map((n) => (
                <Link
                  key={n}
                  href={hrefRanking(baseRanking, { vista: "jornada", j: String(n) })}
                  className={enVistaJornada && jornadaVista === n ? "btn btn--accent" : "btn"}
                  aria-current={enVistaJornada && jornadaVista === n ? "page" : undefined}
                >
                  J{n}
                </Link>
              ))}
            </div>
          )}
          {enVistaJornada ? (
            filasJornada.length === 0 ? (
              <div className="panel" style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>
                Nadie de esta liga pronosticó los partidos ya jugados de la jornada {jornadaVista}.
              </div>
            ) : (
              <div className="panel" style={{ overflowX: "auto" }}>
                <p style={{ margin: 0, padding: "12px 16px 0", color: "var(--text-dim)", fontSize: "0.88rem" }}>
                  Jornada {jornadaVista}
                  {jornadaCompleta ? " · terminada" : " · provisional, quedan partidos por jugar"}
                </p>
                <table className="board">
                  <thead>
                    <tr>
                      <th className="pos">#</th>
                      <th>Jugador</th>
                      <th style={{ textAlign: "right" }}>Exactos</th>
                      <th className="hidem" style={{ textAlign: "right" }}>Aciertos</th>
                      <th className="pts">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasJornada.map((r, i) => (
                      <tr key={r.user_id} className={r.user_id === meId ? "me" : undefined}>
                        <td className={`pos${i < 3 ? " top" : ""}`}>{i + 1}</td>
                        <td className="who">
                          {ganadoresVista.has(r.user_id) && <span title="Ganador de la jornada">🥇 </span>}
                          {r.display_name}
                          {r.user_id === ANFITRION_ID && <span title="El anfitrión"> 🎙️</span>}
                        </td>
                        <td style={{ textAlign: "right" }}>{r.exactos}</td>
                        <td className="hidem" style={{ textAlign: "right" }}>{r.aciertos}</td>
                        <td className="pts">{r.puntos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : rows.length === 0 ? (
            <div
              className="panel"
              style={{
                padding: 32,
                textAlign: "center",
                borderStyle: "dashed",
                color: "var(--text-dim)",
              }}
            >
              Todavía no hay nadie en la clasificación. Haz tu primer pronóstico
              y aparecerás aquí.
              <div style={{ marginTop: 16 }}>
                <Link
                  href={leagueHref("/quiniela-liga/partidos", active)}
                  className="btn btn--accent"
                >
                  Ir a pronosticar <span className="arr">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ overflowX: "auto" }}>
              <table className="board">
                <thead>
                  <tr>
                    <th className="pos">#</th>
                    <th>Jugador</th>
                    <th style={{ textAlign: "right" }}>Exactos</th>
                    <th className="hidem" style={{ textAlign: "right" }}>Aciertos</th>
                    <th className="pts">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.user_id} className={r.user_id === meId ? "me" : undefined}>
                      <td className={`pos${i < 3 ? " top" : ""}`}>{i + 1}</td>
                      <td className="who">
                        {r.display_name}
                        {r.user_id === ANFITRION_ID && <span title="El anfitrión"> 🎙️</span>}
                        {ganadoresUltima.has(r.user_id) && (
                          <span title={`Ganador de la jornada ${ultimaTerminada}`}> 🏅</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>{r.exact_count}</td>
                      <td className="hidem" style={{ textAlign: "right" }}>{r.partial_count}</td>
                      <td className="pts">{r.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
