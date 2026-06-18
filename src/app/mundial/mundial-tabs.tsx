"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  isFinal,
  isLive,
  type Fixture,
  type WcGroup,
  type PlayerSeason,
  type PlayerStatLeader,
  type StandingRow,
} from "@/lib/sports/api-football";
import {
  mergeLiveStandings,
  pendingFixtures,
  type LiveGroup,
} from "@/lib/sports/live-standings";
import type {
  FixtureEvents,
  WcFixture,
  WidgetData,
} from "@/lib/sports/widget-data";
import MatchCardEvents from "@/components/MatchCardEvents";
import type { MundialData, XgLeader } from "./page";

export type Tab = "envivo" | "partidos" | "finalizados" | "grupos" | "stats";

const MADRID_TZ = "Europe/Madrid";

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .toUpperCase();
}

export default function MundialTabs({
  data,
  view,
}: {
  data: MundialData;
  view: Tab;
}) {
  const [tab, setTab] = useState<Tab>(view);
  // Sincroniza con la URL (?v=) cuando se navega desde el desplegable del nav.
  useEffect(() => setTab(view), [view]);

  const anyLive = data.today.some(isLive);

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap">
        <div className="tabs" style={{ marginBottom: 28, maxWidth: 860 }}>
          <button
            type="button"
            className={tab === "envivo" ? "on" : ""}
            onClick={() => setTab("envivo")}
          >
            {anyLive && (
              <span className="livepulse" style={{ marginRight: 7 }} />
            )}
            Marcador en vivo
          </button>
          <button
            type="button"
            className={tab === "partidos" ? "on" : ""}
            onClick={() => setTab("partidos")}
          >
            Próximos partidos
          </button>
          <button
            type="button"
            className={tab === "finalizados" ? "on" : ""}
            onClick={() => setTab("finalizados")}
          >
            Finalizados
          </button>
          <button
            type="button"
            className={tab === "grupos" ? "on" : ""}
            onClick={() => setTab("grupos")}
          >
            Grupos
          </button>
          <button
            type="button"
            className={tab === "stats" ? "on" : ""}
            onClick={() => setTab("stats")}
          >
            Estadísticas
          </button>
        </div>

        {tab === "envivo" && <EnVivoView data={data} />}
        {tab === "partidos" && <PartidosView fixtures={data.fixtures} />}
        {tab === "finalizados" && <FinalizadosView fixtures={data.finished} />}
        {tab === "grupos" && <GruposView groups={data.groups} />}
        {tab === "stats" && <StatsView data={data} />}
      </div>
    </section>
  );
}

/* ---------- Marcador en vivo ---------- */

const POLL_MS = 30_000;
const POLL_LEAD_MS = 30 * 60 * 1000;

/** Hay que seguir poleando si algo está en juego o arranca en <30 min. */
function shouldKeepPolling(fixtures: Fixture[]): boolean {
  const now = Date.now();
  return fixtures.some((f) => {
    if (isLive(f)) return true;
    if (isFinal(f)) return false;
    const ko = new Date(f.fixture.date).getTime();
    return ko - now < POLL_LEAD_MS && ko - now > -3 * 60 * 60 * 1000;
  });
}

function EnVivoView({ data }: { data: MundialData }) {
  const [fixtures, setFixtures] = useState<WcFixture[]>(data.today);
  // Partidos que han estado en juego con la página abierta: su resultado no
  // está en el snapshot de la clasificación oficial, así que se les sigue
  // sumando aunque terminen (hasta recargar).
  const carryRef = useRef<Set<number>>(new Set(data.carryIds));

  const polling = shouldKeepPolling(fixtures);

  useEffect(() => {
    if (!polling) return;

    let cancelled = false;

    async function tick() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/sports/widget", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: WidgetData = await res.json();
        if (cancelled || next.mode !== "wc") return;
        for (const f of next.fixtures) {
          if (isLive(f)) carryRef.current.add(f.fixture.id);
        }
        setFixtures(next.fixtures);
      } catch {
        // Best-effort: un fallo puntual de red no debe romper la vista.
      }
    }

    const timer = setInterval(tick, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [polling]);

  const byKickoff = (a: Fixture, b: Fixture) =>
    new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();

  const live = fixtures.filter(isLive).sort(byKickoff);
  const upcoming = fixtures
    .filter((f) => !isLive(f) && !isFinal(f))
    .sort(byKickoff);
  const finishedToday = fixtures.filter(isFinal).sort((a, b) => byKickoff(b, a));

  const pending = pendingFixtures(fixtures, carryRef.current);
  const liveGroups = mergeLiveStandings(data.groups, pending).filter(
    (g) => g.adjusted,
  );

  return (
    <div className="space-y-8">
      {live.length > 0 ? (
        <div>
          <div className="shead">
            <h2>En juego</h2>
            <span className="sh-note">
              <span className="livepulse" style={{ marginRight: 7 }} />
              el marcador se actualiza solo
            </span>
          </div>
          <div className="grid2">
            {live.map((fx) => (
              <LiveMatchCard key={fx.fixture.id} fx={fx} />
            ))}
          </div>
        </div>
      ) : (
        <Empty>
          No hay ningún partido en juego ahora mismo.
          {upcoming.length > 0 && (
            <>
              {" "}
              El próximo: <b>{upcoming[0].teams.home.name}</b> –{" "}
              <b>{upcoming[0].teams.away.name}</b> ·{" "}
              {formatKickoff(upcoming[0].fixture.date)}.
            </>
          )}
        </Empty>
      )}

      {liveGroups.length > 0 && (
        <div>
          <div className="shead">
            <h2>Clasificación en vivo</h2>
            <span className="sh-note">
              provisional — se mueve con el marcador
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {liveGroups.map((g) => (
              <LiveGroupTable key={g.group} group={g} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="shead">
            <h2>Próximos hoy</h2>
          </div>
          <div className="grid2">
            {upcoming.map((fx) => (
              <LiveMatchCard key={fx.fixture.id} fx={fx} />
            ))}
          </div>
        </div>
      )}

      {finishedToday.length > 0 && (
        <div>
          <div className="shead">
            <h2>Terminados</h2>
            <span className="sh-note">la jornada de hoy</span>
          </div>
          <div className="grid2">
            {finishedToday.map((fx) => (
              <LiveMatchCard key={fx.fixture.id} fx={fx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveMatchCard({ fx }: { fx: WcFixture }) {
  const live = isLive(fx);
  const final = isFinal(fx);
  const showScore = live || final;
  const played = live || final;
  const inner = (
    <>
      <div className="match__meta">
        <span className="match__grp">{fx.league.round}</span>
        {live ? (
          <span className="badge badge--danger">
            <span className="livepulse" />
            {fx.fixture.status.short === "HT"
              ? "DESCANSO"
              : fx.fixture.status.elapsed != null
                ? `${fx.fixture.status.elapsed}'`
                : "EN VIVO"}
          </span>
        ) : final ? (
          <span className="badge">Final</span>
        ) : (
          <span className="match__when">{formatKickoff(fx.fixture.date)}</span>
        )}
      </div>
      <div className="team">
        <span className="flag">
          <Image src={fx.teams.home.logo} alt="" width={20} height={20} unoptimized />
        </span>
        <span
          className="tn"
          style={final && !fx.teams.home.winner ? { color: "var(--text-dim)" } : undefined}
        >
          {fx.teams.home.name}
        </span>
      </div>
      <div className="score">
        {showScore ? (
          <>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.4rem" }}>
              {fx.goals.home ?? 0}
            </b>
            <span className="vs">–</span>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.4rem" }}>
              {fx.goals.away ?? 0}
            </b>
          </>
        ) : (
          <span className="vs">VS</span>
        )}
      </div>
      <div className="team right">
        <span
          className="tn"
          style={final && !fx.teams.away.winner ? { color: "var(--text-dim)" } : undefined}
        >
          {fx.teams.away.name}
        </span>
        <span className="flag">
          <Image src={fx.teams.away.logo} alt="" width={20} height={20} unoptimized />
        </span>
      </div>
      <MatchCardEvents
        ev={fx.ev}
        homeId={fx.teams.home.id}
        awayId={fx.teams.away.id}
      />
      {played && (
        <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
          <span />
          <span className="match__when" style={{ color: "var(--accent)" }}>
            Ver estadísticas →
          </span>
        </div>
      )}
    </>
  );
  if (played) {
    return (
      <Link
        href={`/mundial/partido/${fx.fixture.id}`}
        className="match"
        style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
      >
        {inner}
      </Link>
    );
  }
  return <div className="match">{inner}</div>;
}

function LiveGroupTable({ group }: { group: LiveGroup }) {
  return (
    <section className="panel" style={{ overflow: "hidden" }}>
      <header
        className="mono"
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "12px 16px",
          color: "var(--accent)",
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {group.group.replace("Group", "Grupo")}
        <span className="badge badge--danger">
          <span className="livepulse" />
          EN VIVO
        </span>
      </header>
      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((r) => (
            <tr key={r.team.id}>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <RankPill rank={r.rank} />
                  {r.delta !== 0 && (
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: "0.66rem",
                        fontWeight: 700,
                        color: r.delta > 0 ? "#4ade80" : "#ff8a8a",
                      }}
                      title={`${r.delta > 0 ? "Sube" : "Baja"} ${Math.abs(r.delta)} ${Math.abs(r.delta) === 1 ? "puesto" : "puestos"} con el marcador actual`}
                    >
                      {r.delta > 0 ? "▲" : "▼"}
                      {Math.abs(r.delta)}
                    </span>
                  )}
                </span>
              </td>
              <td>
                <span className="club">
                  <Image
                    className="crest"
                    src={r.team.logo}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                  />
                  <b>{r.team.name}</b>
                  {r.isPlaying && <span className="livepulse" />}
                </span>
              </td>
              <td className="tabular-nums" style={{ color: "var(--text-dim)" }}>
                {r.all.played}
              </td>
              <td
                className="tabular-nums"
                style={{
                  color:
                    r.goalsDiff > 0
                      ? "#4ade80"
                      : r.goalsDiff < 0
                        ? "#ff8a8a"
                        : "var(--text-dim)",
                }}
              >
                {r.goalsDiff > 0 ? "+" : ""}
                {r.goalsDiff}
              </td>
              <td className="ptsc">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        style={{
          margin: 0,
          padding: "10px 16px",
          fontSize: "0.74rem",
          color: "var(--text-dim)",
          borderTop: "1px solid var(--line)",
        }}
      >
        Tabla provisional con el resultado parcial — la oficial se consolida al
        final del partido.
      </p>
    </section>
  );
}

/* ---------- Próximos partidos ---------- */

function PartidosView({ fixtures }: { fixtures: Fixture[] }) {
  if (fixtures.length === 0) {
    return (
      <Empty>No hay partidos próximos en el calendario ahora mismo.</Empty>
    );
  }
  return (
    <div className="grid2">
      {fixtures.map((fx) => {
        const showScore = isLive(fx) || isFinal(fx);
        const live = isLive(fx);
        return (
          <div className="match" key={fx.fixture.id}>
            <div className="match__meta">
              <span className="match__grp">{fx.league.round}</span>
              {live ? (
                <span className="badge badge--danger">
                  <span className="livepulse" />
                  {fx.fixture.status.elapsed != null
                    ? `${fx.fixture.status.elapsed}'`
                    : "EN VIVO"}
                </span>
              ) : (
                <span className="match__when">
                  {formatKickoff(fx.fixture.date)}
                </span>
              )}
            </div>
            <div className="team">
              <span className="flag">
                <Image
                  src={fx.teams.home.logo}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                />
              </span>
              <span className="tn">{fx.teams.home.name}</span>
            </div>
            <div className="score">
              {showScore ? (
                <>
                  <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
                    {fx.goals.home ?? 0}
                  </b>
                  <span className="vs">–</span>
                  <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
                    {fx.goals.away ?? 0}
                  </b>
                </>
              ) : (
                <span className="vs">VS</span>
              )}
            </div>
            <div className="team right">
              <span className="tn">{fx.teams.away.name}</span>
              <span className="flag">
                <Image
                  src={fx.teams.away.logo}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Finalizados ---------- */

/** Orden de torneo + etiqueta corta para la ronda que devuelve el API. */
function roundMeta(round: string): { order: number; label: string } {
  const g = round.match(/Group Stage\s*-\s*(\d+)/i);
  if (g) return { order: Number(g[1]), label: `Jornada ${g[1]}` };
  if (/Round of 32/i.test(round)) return { order: 10, label: "Dieciseisavos" };
  if (/Round of 16/i.test(round)) return { order: 11, label: "Octavos" };
  if (/Quarter/i.test(round)) return { order: 12, label: "Cuartos" };
  if (/Semi/i.test(round)) return { order: 13, label: "Semis" };
  if (/3rd Place/i.test(round)) return { order: 14, label: "3er puesto" };
  if (/^Final$/i.test(round.trim())) return { order: 15, label: "Final" };
  return { order: 99, label: round };
}

function FinalizadosView({ fixtures }: { fixtures: Fixture[] }) {
  const done = fixtures.filter((fx) => isFinal(fx));

  // Agrupar por ronda (Jornada 1/2/3, Octavos, …) en orden de torneo.
  const byRound = new Map<string, Fixture[]>();
  for (const fx of done) {
    const r = fx.league.round || "—";
    const arr = byRound.get(r);
    if (arr) arr.push(fx);
    else byRound.set(r, [fx]);
  }
  const rounds = Array.from(byRound.keys()).sort(
    (a, b) => roundMeta(a).order - roundMeta(b).order,
  );

  // Por defecto, la última ronda con resultados (la jornada más avanzada).
  const [sel, setSel] = useState<string>(() => rounds[rounds.length - 1] ?? "");

  if (done.length === 0) {
    return <Empty>Aún no hay partidos finalizados — el primero cae pronto.</Empty>;
  }

  const active = byRound.has(sel) ? sel : rounds[rounds.length - 1];
  const list = [...(byRound.get(active) ?? [])].sort(
    (a, b) =>
      new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime(),
  );

  // Goles/expulsiones de la jornada que se está viendo, bajo demanda (no se
  // cargan los 100+ finalizados en cada render). Se cachean en el cliente.
  const [eventsById, setEventsById] = useState<Record<number, FixtureEvents>>({});
  const evRef = useRef(eventsById);
  evRef.current = eventsById;
  const activeIds = list.map((fx) => fx.fixture.id).join(",");

  useEffect(() => {
    const ids = activeIds
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((id) => !(id in evRef.current));
    if (ids.length === 0) return;
    let cancelled = false;
    fetch(`/api/sports/match-events?ids=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<number, FixtureEvents>) => {
        if (!cancelled) setEventsById((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeIds]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {rounds.map((r) => (
          <button
            key={r}
            type="button"
            className={`chip-pill${r === active ? " on" : ""}`}
            onClick={() => setSel(r)}
          >
            {roundMeta(r).label}
            <span style={{ marginLeft: 6, opacity: 0.6 }}>
              {byRound.get(r)!.length}
            </span>
          </button>
        ))}
      </div>
      <div className="grid2">
        {list.map((fx) => (
          <FinishedCard
            key={fx.fixture.id}
            fx={fx}
            ev={eventsById[fx.fixture.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function FinishedCard({ fx, ev }: { fx: Fixture; ev: FixtureEvents | null }) {
  return (
    <Link
      href={`/mundial/partido/${fx.fixture.id}`}
      className="match"
      style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
    >
      <div className="match__meta">
        <span className="match__grp">{fx.league.round}</span>
        <span className="badge">Final</span>
      </div>
      <div className="team">
        <span className="flag">
          <Image src={fx.teams.home.logo} alt="" width={20} height={20} unoptimized />
        </span>
        <span
          className="tn"
          style={fx.teams.home.winner ? undefined : { color: "var(--text-dim)" }}
        >
          {fx.teams.home.name}
        </span>
      </div>
      <div className="score">
        <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.4rem" }}>
          {fx.goals.home ?? 0}
        </b>
        <span className="vs">–</span>
        <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.4rem" }}>
          {fx.goals.away ?? 0}
        </b>
      </div>
      <div className="team right">
        <span
          className="tn"
          style={fx.teams.away.winner ? undefined : { color: "var(--text-dim)" }}
        >
          {fx.teams.away.name}
        </span>
        <span className="flag">
          <Image src={fx.teams.away.logo} alt="" width={20} height={20} unoptimized />
        </span>
      </div>
      <MatchCardEvents
        ev={ev}
        homeId={fx.teams.home.id}
        awayId={fx.teams.away.id}
      />
      <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
        <span className="match__when">{formatKickoff(fx.fixture.date)}</span>
        <span className="match__when" style={{ color: "var(--accent)" }}>
          Ver estadísticas →
        </span>
      </div>
    </Link>
  );
}

/* ---------- Grupos ---------- */

function GruposView({ groups }: { groups: WcGroup[] }) {
  if (groups.length === 0) {
    return <Empty>Los grupos aparecerán en cuanto se confirmen.</Empty>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <GroupTable key={g.group} group={g} />
      ))}
    </div>
  );
}

function GroupTable({ group }: { group: WcGroup }) {
  return (
    <section className="panel" style={{ overflow: "hidden" }}>
      <header
        className="mono"
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "12px 16px",
          color: "var(--accent)",
          fontWeight: 700,
        }}
      >
        {group.group.replace("Group", "Grupo")}
      </header>
      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((r) => (
            <tr key={r.team.id}>
              <td>
                <RankPill rank={r.rank} />
              </td>
              <td>
                <span className="club">
                  <Image
                    className="crest"
                    src={r.team.logo}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                  />
                  <b>{r.team.name}</b>
                </span>
              </td>
              <td className="tabular-nums" style={{ color: "var(--text-dim)" }}>
                {r.all.played}
              </td>
              <td
                className="tabular-nums"
                style={{
                  color:
                    r.goalsDiff > 0
                      ? "#4ade80"
                      : r.goalsDiff < 0
                        ? "#ff8a8a"
                        : "var(--text-dim)",
                }}
              >
                {r.goalsDiff > 0 ? "+" : ""}
                {r.goalsDiff}
              </td>
              <td className="ptsc">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RankPill({ rank }: { rank: number }) {
  const style =
    rank <= 2
      ? { background: "rgba(74,222,128,0.15)", color: "#4ade80" }
      : { background: "var(--surface-2)", color: "var(--text-dim)" };
  return (
    <span
      className="tabular-nums"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 5,
        fontSize: "0.7rem",
        fontWeight: 700,
        ...style,
      }}
    >
      {rank}
    </span>
  );
}

/* ---------- Estadísticas ---------- */

function StatsView({ data }: { data: MundialData }) {
  const { scorers, assists, ratings, attackDefense, xg, active } = data;
  const noPlayerData = scorers.length === 0 && assists.length === 0;
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      {openId != null && (
        <PlayerSeasonModal id={openId} onClose={() => setOpenId(null)} />
      )}
      {xg && (
        <div className="grid3">
          <XgCard xg={xg} />
        </div>
      )}

      {(attackDefense.attack.length > 0 || attackDefense.defense.length > 0) && (
        <div className="grid2" style={{ alignItems: "start" }}>
          <div>
            <div className="shead">
              <h2>Mejor ataque</h2>
              <span className="sh-note">goles a favor</span>
            </div>
            <TeamMiniTable rows={attackDefense.attack} metric="gf" />
          </div>
          <div>
            <div className="shead">
              <h2>Mejor defensa</h2>
              <span className="sh-note">goles en contra</span>
            </div>
            <TeamMiniTable rows={attackDefense.defense} metric="gc" />
          </div>
        </div>
      )}

      <div>
        <div className="shead">
          <h2>Tabla de goleadores</h2>
        </div>
        {scorers.length > 0 ? (
          <PlayerTable players={scorers} metric="goals" onPick={setOpenId} />
        ) : (
          <Empty>
            {active
              ? "El API publica las estadísticas de jugadores con algo de retraso los primeros días — aparecerán solas."
              : "Disponible cuando arranque el Mundial."}
          </Empty>
        )}
      </div>

      <div>
        <div className="shead">
          <h2>Tabla de asistidores</h2>
        </div>
        {assists.length > 0 ? (
          <PlayerTable players={assists} metric="assists" onPick={setOpenId} />
        ) : (
          <Empty>
            {active
              ? "Igual que los goleadores: en cuanto el API los publique, aquí estarán."
              : "Disponible cuando arranque el Mundial."}
          </Empty>
        )}
      </div>

      <div>
        <div className="shead">
          <h2>Valoración por jugador</h2>
          <span className="sh-note">nota media · entre los destacados</span>
        </div>
        {ratings.length > 0 ? (
          <PlayerTable players={ratings} metric="rating" onPick={setOpenId} />
        ) : (
          <Empty>
            {noPlayerData && active
              ? "Se calcula con la nota media que publica el API — llegará con las tablas de arriba."
              : "Disponible cuando arranque el Mundial."}
          </Empty>
        )}
      </div>
    </div>
  );
}

function PlayerTable({
  players,
  metric,
  onPick,
}: {
  players: PlayerStatLeader[];
  metric: "goals" | "assists" | "rating";
  onPick: (id: number) => void;
}) {
  const label =
    metric === "goals" ? "Goles" : metric === "assists" ? "Asist." : "Nota";
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>Selección</th>
            <th className="hidden text-right sm:table-cell">PJ</th>
            <th className="hidden text-right sm:table-cell">Min</th>
            <th className="text-right">{label}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => {
            const st = p.statistics[0];
            const value =
              metric === "goals"
                ? (st?.goals.total ?? 0)
                : metric === "assists"
                  ? (st?.goals.assists ?? 0)
                  : st?.games.rating
                    ? parseFloat(st.games.rating).toFixed(2)
                    : "—";
            return (
              <tr
                key={p.player.id}
                onClick={() => onPick(p.player.id)}
                style={{ cursor: "pointer" }}
                title={`Ver estadísticas de ${p.player.name} en el Mundial`}
              >
                <td className="pos">{i + 1}</td>
                <td className="who">
                  <span className="flex items-center gap-2">
                    {p.player.photo && (
                      <Image
                        src={p.player.photo}
                        alt=""
                        width={26}
                        height={26}
                        unoptimized
                        style={{ borderRadius: "50%", objectFit: "cover" }}
                      />
                    )}
                    {p.player.name}
                  </span>
                </td>
                <td>
                  <span className="flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
                    {st?.team.logo && (
                      <Image src={st.team.logo} alt="" width={18} height={18} unoptimized />
                    )}
                    {st?.team.name}
                  </span>
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{ color: "var(--text-dim)" }}
                >
                  {st?.games.appearences ?? "—"}
                </td>
                <td
                  className="hidden text-right tabular-nums sm:table-cell"
                  style={{ color: "var(--text-dim)" }}
                >
                  {st?.games.minutes ?? "—"}
                </td>
                <td className="pts">{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const POS_SEASON: Record<string, string> = {
  Attacker: "Delantero",
  Midfielder: "Centrocampista",
  Defender: "Defensa",
  Goalkeeper: "Portero",
};

function seasonColor(r: number): string {
  if (r >= 7.5) return "#4ade80";
  if (r >= 6.5) return "var(--text)";
  return "#ff8a8a";
}

function PlayerSeasonModal({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const [p, setP] = useState<PlayerSeason | null | "loading">("loading");
  useEffect(() => {
    let cancelled = false;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    fetch(`/api/sports/player?id=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PlayerSeason | null) => {
        if (!cancelled) setP(d ?? null);
      })
      .catch(() => {
        if (!cancelled) setP(null);
      });
    return () => {
      cancelled = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [id, onClose]);

  return (
    <div className="pmodal-backdrop" onClick={onClose} role="dialog" aria-modal>
      <div className="pmodal" onClick={(e) => e.stopPropagation()}>
        {p === "loading" ? (
          <p style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)" }}>
            Cargando…
          </p>
        ) : !p ? (
          <p style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)" }}>
            Aún no hay estadísticas de este jugador.
          </p>
        ) : (
          <SeasonContent p={p} />
        )}
        <button
          type="button"
          className="btn btn--ghost"
          style={{ width: "100%", marginTop: 16 }}
          onClick={onClose}
        >
          Hecho
        </button>
      </div>
    </div>
  );
}

function SeasonContent({ p }: { p: PlayerSeason }) {
  const lines: { label: string; value: string | number | null }[] = [
    { label: "Partidos jugados", value: p.appearances },
    { label: "Titularidades", value: p.lineups },
    { label: "Minutos", value: p.minutes != null ? `${p.minutes}'` : null },
    { label: "Goles", value: p.goals },
    { label: "Asistencias", value: p.assists },
    {
      label: "Tiros",
      value:
        p.shotsTotal != null
          ? `${p.shotsTotal}${p.shotsOn != null ? ` (${p.shotsOn} a puerta)` : ""}`
          : null,
    },
    {
      label: "Pases",
      value:
        p.passesTotal != null
          ? `${p.passesTotal}${p.passesAcc != null ? ` · ${p.passesAcc}%` : ""}`
          : null,
    },
    { label: "Pases clave", value: p.passesKey },
    {
      label: "Regates",
      value:
        p.dribblesAttempts != null || p.dribblesSuccess != null
          ? `${p.dribblesSuccess ?? 0}/${p.dribblesAttempts ?? 0}`
          : null,
    },
    {
      label: "Duelos ganados",
      value: p.duelsTotal != null ? `${p.duelsWon ?? 0}/${p.duelsTotal}` : null,
    },
    { label: "Entradas", value: p.tackles },
    { label: "Intercepciones", value: p.interceptions },
    { label: "Faltas cometidas", value: p.foulsCommitted },
    { label: "Faltas recibidas", value: p.foulsDrawn },
    { label: "Penaltis marcados", value: p.penaltyScored || null },
    { label: "Amarillas", value: p.yellow || null },
    { label: "Rojas", value: p.red || null },
  ].filter((l) => l.value != null && l.value !== "");

  const posES = p.position ? (POS_SEASON[p.position] ?? p.position) : null;

  return (
    <>
      <div className="pmodal-head" style={{ justifyContent: "center" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          {p.photo ? (
            <Image
              src={p.photo}
              alt=""
              width={76}
              height={76}
              unoptimized
              style={{ borderRadius: "50%", objectFit: "cover", background: "var(--surface-2)" }}
            />
          ) : (
            <span
              style={{
                display: "inline-block",
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "var(--surface-2)",
              }}
            />
          )}
          {p.rating != null && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -10,
                background: seasonColor(p.rating),
                color: "#0a1030",
                borderRadius: 8,
                padding: "2px 8px",
                fontWeight: 800,
                fontSize: "1rem",
              }}
            >
              {p.rating.toFixed(2)}
            </span>
          )}
          {p.team?.logo ? (
            <Image
              src={p.team.logo}
              alt=""
              width={24}
              height={24}
              unoptimized
              style={{ position: "absolute", bottom: -2, right: -6, borderRadius: "50%", background: "var(--surface)", padding: 1 }}
            />
          ) : null}
        </div>
      </div>
      <h3 style={{ textAlign: "center", margin: "8px 0 4px", fontSize: "1.2rem", fontWeight: 800 }}>
        {p.name}
      </h3>
      <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem", margin: "0 0 12px" }}>
        {[p.team?.name, posES, p.age != null ? `${p.age} años` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p
        className="mono"
        style={{ textAlign: "center", color: "var(--accent)", fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 14px" }}
      >
        Totales del Mundial
      </p>
      <div className="panel" style={{ overflow: "hidden" }}>
        {lines.map((l, i) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 14px",
              borderBottom: i < lines.length - 1 ? "1px solid var(--line)" : undefined,
              fontSize: "0.9rem",
            }}
          >
            <span style={{ color: "var(--text-dim)" }}>{l.label}</span>
            <b className="tabular-nums">{l.value}</b>
          </div>
        ))}
      </div>
    </>
  );
}

function TeamMiniTable({
  rows,
  metric,
}: {
  rows: StandingRow[];
  metric: "gf" | "gc";
}) {
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Selección</th>
            <th className="hidden text-right sm:table-cell">PJ</th>
            <th className="text-right">{metric === "gf" ? "GF" : "GC"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id}>
              <td className="pos">{i + 1}</td>
              <td className="who">
                <span className="flex items-center gap-2">
                  <Image
                    src={r.team.logo}
                    alt=""
                    width={22}
                    height={22}
                    unoptimized
                  />
                  {r.team.name}
                </span>
              </td>
              <td
                className="hidden text-right tabular-nums sm:table-cell"
                style={{ color: "var(--text-dim)" }}
              >
                {r.all.played}
              </td>
              <td className="pts">
                {metric === "gf" ? r.all.goals.for : r.all.goals.against}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function XgCard({ xg }: { xg: XgLeader }) {
  return (
    <div className="infocard">
      <span className="infocard__tag">Equipo con más xG</span>
      <div className="flex items-center gap-3" style={{ marginTop: 14 }}>
        <Image src={xg.team.logo} alt="" width={36} height={36} unoptimized />
        <span className="display" style={{ fontSize: "1.5rem" }}>
          {xg.team.name}
        </span>
      </div>
      <div className="bignum" style={{ fontSize: "2.6rem", marginTop: 12, color: "var(--accent)" }}>
        {xg.xg.toFixed(1)}
      </div>
      <p style={{ color: "var(--text-dim)", fontSize: "0.84rem", margin: "2px 0 0" }}>
        xG acumulado
      </p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="panel"
      style={{
        padding: 32,
        textAlign: "center",
        borderStyle: "dashed",
        color: "var(--text-dim)",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
