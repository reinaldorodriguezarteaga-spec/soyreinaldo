"use client";

/**
 * Vistas compartidas del árbol /liga/[slug]: partidos en vivo/próximos/
 * finalizados, tabla de jugadores, estadísticas y récords — todas
 * parametrizadas por `Competition` (nombre, slug para las rutas, id/season
 * para las llamadas a la API vía los endpoints bajo demanda).
 *
 * Es una EXTRACCIÓN/COPIA de la lógica genérica que vive en
 * `src/app/mundial/mundial-tabs.tsx` (que sigue intacto, congelado, usando
 * los wrappers WC de siempre) — no una migración. Difiere de la original en:
 *  - Sin `GruposView`/`SeleccionesView`/clasificación en vivo por grupos
 *    (exclusivo del Mundial, formato de grupos). Ver `StandingsTableView`
 *    en su lugar, para competiciones de tabla plana (`standingsMode: "table"`).
 *  - Los enlaces usan `/liga/${competition.slug}/...` en vez de `/mundial/...`.
 *  - Los fetch bajo demanda (jugadores, récords de juego, ficha de jugador,
 *    marcador en vivo) pasan `?competition=<slug>` a los endpoints de
 *    `/api/sports/*`, generalizados en PR3 para aceptar ese parámetro
 *    (por defecto siguen resolviendo al Mundial 2026, así que /mundial no se
 *    ve afectado).
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  isFinal,
  isLive,
  tournamentRecords,
  teamGoalLeaders,
  type Fixture,
  type PlayerSeason,
  type PlayerExtras,
  type PlayerStatLeader,
  type StandingRow,
  type AllPlayer,
  type TournamentRecords,
  type GameRecords,
} from "@/lib/sports/api-football";
import type { Competition } from "@/lib/sports/competitions";
import type { FixtureEvents, WcFixture } from "@/lib/sports/widget-data";
import MatchCardEvents from "@/components/MatchCardEvents";
import { SkeletonBar } from "@/components/Skeleton";
import PlayerExtrasBlock from "@/components/PlayerExtras";

export type LigaTab =
  | "envivo"
  | "partidos"
  | "finalizados"
  | "tabla"
  | "jugadores"
  | "stats";

const MADRID_TZ = "Europe/Madrid";

export function formatKickoff(iso: string) {
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

function basePath(competition: Competition) {
  return `/liga/${competition.slug}`;
}

export function Empty({ children }: { children: React.ReactNode }) {
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

/** Forma reciente (últimos partidos) como puntos V/E/D. */
export function FormMini({ form }: { form: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    W: { bg: "#4ade80", fg: "#0a1030", label: "V" },
    D: { bg: "var(--line-strong)", fg: "var(--text)", label: "E" },
    L: { bg: "#ff8a8a", fg: "#0a1030", label: "D" },
  };
  const chars = form.replace(/[^WDL]/g, "").slice(-5).split("");
  if (chars.length === 0) return null;
  return (
    <span
      style={{ display: "inline-flex", gap: 3, marginTop: 4 }}
      title={`Forma: ${chars.join("")}`}
      aria-label={`Forma reciente ${chars.join("")}`}
    >
      {chars.map((c, i) => {
        const s = map[c] ?? { bg: "var(--line-strong)", fg: "var(--text)", label: c };
        return (
          <span
            key={i}
            style={{
              width: 13,
              height: 13,
              borderRadius: 3,
              background: s.bg,
              color: s.fg,
              fontSize: "0.5rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {s.label}
          </span>
        );
      })}
    </span>
  );
}

export function RankPill({ rank }: { rank: number }) {
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

/** Input de búsqueda reutilizable para filtrar una lista. */
export function ListSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      className="field"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", marginBottom: 16 }}
      aria-label={placeholder}
    />
  );
}

/** Barra compacta de probabilidad 1X2 para las tarjetas de Próximos. */
export function ProbBar({
  pred,
}: {
  pred: { home: number; draw: number; away: number };
}) {
  const total = pred.home + pred.draw + pred.away || 1;
  const w = (v: number) => `${(v / total) * 100}%`;
  return (
    <div style={{ marginTop: 8 }} title="Probabilidad estimada (API-Football)">
      <div
        style={{
          display: "flex",
          height: 5,
          borderRadius: 3,
          overflow: "hidden",
          background: "var(--surface-2)",
        }}
      >
        <span style={{ width: w(pred.home), background: "var(--accent)" }} />
        <span style={{ width: w(pred.draw), background: "var(--line-strong)" }} />
        <span style={{ width: w(pred.away), background: "#ff5b8a" }} />
      </div>
      <div
        className="tabular-nums"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.6rem",
          color: "var(--text-dim)",
          marginTop: 3,
        }}
      >
        <span>{pred.home}%</span>
        <span>empate {pred.draw}%</span>
        <span>{pred.away}%</span>
      </div>
    </div>
  );
}

/* ---------- Marcador en vivo ---------- */

// >45s (el TTL de getCompetitionFixturesWindow) para que la mayoría de polls
// acierten en caché en vez de pegar en vivo a la API.
const POLL_MS = 30_000;
const POLL_LEAD_MS = 30 * 60 * 1000;

function shouldKeepPolling(fixtures: Fixture[]): boolean {
  const now = Date.now();
  return fixtures.some((f) => {
    if (isLive(f)) return true;
    if (isFinal(f)) return false;
    const ko = new Date(f.fixture.date).getTime();
    return ko - now < POLL_LEAD_MS && ko - now > -3 * 60 * 60 * 1000;
  });
}

export function LiveMatchCard({
  competition,
  fx,
}: {
  competition: Competition;
  fx: WcFixture;
}) {
  const base = basePath(competition);
  const live = isLive(fx);
  const final = isFinal(fx);
  const played = live || final;

  const meta = (
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
  );

  if (played) {
    return (
      <Link
        href={`${base}/partido/${fx.fixture.id}`}
        className="match"
        style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
      >
        {meta}
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
            style={final && !fx.teams.away.winner ? { color: "var(--text-dim)" } : undefined}
          >
            {fx.teams.away.name}
          </span>
          <span className="flag">
            <Image src={fx.teams.away.logo} alt="" width={20} height={20} unoptimized />
          </span>
        </div>
        <MatchCardEvents ev={fx.ev} homeId={fx.teams.home.id} awayId={fx.teams.away.id} />
        <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
          <span />
          <span className="match__when" style={{ color: "var(--accent)" }}>
            Ver estadísticas →
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="match">
      {meta}
      <Link
        href={`${base}/equipo/${fx.teams.home.id}`}
        className="team"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <span className="flag">
          <Image src={fx.teams.home.logo} alt="" width={20} height={20} unoptimized />
        </span>
        <span className="tn">{fx.teams.home.name}</span>
      </Link>
      <Link
        href={`${base}/partido/${fx.fixture.id}`}
        className="score"
        style={{ color: "inherit", textDecoration: "none" }}
        title="Ver cuenta atrás"
      >
        <span className="vs">VS</span>
      </Link>
      <Link
        href={`${base}/equipo/${fx.teams.away.id}`}
        className="team right"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <span className="tn">{fx.teams.away.name}</span>
        <span className="flag">
          <Image src={fx.teams.away.logo} alt="" width={20} height={20} unoptimized />
        </span>
      </Link>
      <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
        <span />
        <Link
          href={`${base}/partido/${fx.fixture.id}`}
          className="match__when"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          ⏱ Cuenta atrás →
        </Link>
      </div>
    </div>
  );
}

export function EnVivoView({
  competition,
  initialToday,
}: {
  competition: Competition;
  initialToday: WcFixture[];
}) {
  const [fixtures, setFixtures] = useState<WcFixture[]>(initialToday);
  const polling = shouldKeepPolling(fixtures);

  useEffect(() => {
    if (!polling) return;
    let cancelled = false;

    async function tick() {
      if (document.hidden) return;
      try {
        const res = await fetch(
          `/api/sports/competition-window?slug=${competition.slug}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data: { fixtures: WcFixture[] } = await res.json();
        if (!cancelled) setFixtures(data.fixtures ?? []);
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
  }, [polling, competition.slug]);

  const byKickoff = (a: Fixture, b: Fixture) =>
    new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime();

  const live = fixtures.filter(isLive).sort(byKickoff);
  const upcoming = fixtures
    .filter((f) => !isLive(f) && !isFinal(f))
    .sort(byKickoff);
  const finishedToday = fixtures.filter(isFinal).sort((a, b) => byKickoff(b, a));

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
              <LiveMatchCard key={fx.fixture.id} competition={competition} fx={fx} />
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

      {upcoming.length > 0 && (
        <div>
          <div className="shead">
            <h2>Próximos hoy</h2>
          </div>
          <div className="grid2">
            {upcoming.map((fx) => (
              <LiveMatchCard key={fx.fixture.id} competition={competition} fx={fx} />
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
              <LiveMatchCard key={fx.fixture.id} competition={competition} fx={fx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Próximos partidos ---------- */

export function PartidosView({
  competition,
  fixtures,
}: {
  competition: Competition;
  fixtures: Fixture[];
}) {
  const base = basePath(competition);
  const [preds, setPreds] = useState<
    Record<number, { home: number; draw: number; away: number }>
  >({});
  const upcomingKey = fixtures
    .filter((f) => !isLive(f) && !isFinal(f))
    .map((f) => f.fixture.id)
    .join(",");

  useEffect(() => {
    if (!upcomingKey) return;
    let cancelled = false;
    fetch(`/api/sports/predictions?fixtures=${upcomingKey}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<number, { home: number; draw: number; away: number }>) => {
        if (!cancelled) setPreds(d ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [upcomingKey]);

  if (fixtures.length === 0) {
    return <Empty>No hay partidos próximos en el calendario ahora mismo.</Empty>;
  }
  return (
    <div className="grid2">
      {fixtures.map((fx) => {
        const showScore = isLive(fx) || isFinal(fx);
        const live = isLive(fx);
        const pred = !showScore ? preds[fx.fixture.id] : undefined;
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
            <Link
              href={`${base}/equipo/${fx.teams.home.id}`}
              className="team"
              style={{ color: "inherit", textDecoration: "none" }}
            >
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
            </Link>
            <Link
              href={`${base}/partido/${fx.fixture.id}`}
              className="score"
              style={{ color: "inherit", textDecoration: "none" }}
              title={showScore ? "Ver estadísticas" : "Ver cuenta atrás"}
            >
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
            </Link>
            <Link
              href={`${base}/equipo/${fx.teams.away.id}`}
              className="team right"
              style={{ color: "inherit", textDecoration: "none" }}
            >
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
            </Link>
            {pred && <ProbBar pred={pred} />}
            <div className="match__meta" style={{ marginBottom: 0, marginTop: 4 }}>
              <span />
              <Link
                href={`${base}/partido/${fx.fixture.id}`}
                className="match__when"
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                {showScore ? "Ver estadísticas →" : "⏱ Cuenta atrás →"}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Finalizados ---------- */

/**
 * Orden + etiqueta corta de una ronda. Sin config por competición (LaLiga
 * solo tiene jornadas de liga regular) — cubre el patrón habitual de
 * API-Football ("Regular Season - N") y, si en el futuro una competición KO
 * (p. ej. Champions) usa otro formato, muestra el string tal cual en vez de
 * fallar.
 */
export function roundMeta(round: string): { order: number; label: string } {
  const g = round.match(/Regular Season\s*-\s*(\d+)/i);
  if (g) return { order: Number(g[1]), label: `Jornada ${g[1]}` };
  const g2 = round.match(/Group Stage\s*-\s*(\d+)/i);
  if (g2) return { order: Number(g2[1]), label: `Jornada ${g2[1]}` };
  if (/Round of 32/i.test(round)) return { order: 900, label: "Dieciseisavos" };
  if (/Round of 16/i.test(round)) return { order: 901, label: "Octavos" };
  if (/Quarter/i.test(round)) return { order: 902, label: "Cuartos" };
  if (/Semi/i.test(round)) return { order: 903, label: "Semis" };
  if (/3rd Place/i.test(round)) return { order: 904, label: "3er puesto" };
  if (/^Final$/i.test(round.trim())) return { order: 905, label: "Final" };
  return { order: 999, label: round };
}

export function FinalizadosView({
  competition,
  fixtures,
}: {
  competition: Competition;
  fixtures: Fixture[];
}) {
  const done = fixtures.filter((fx) => isFinal(fx));

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

  const [sel, setSel] = useState<string>(() => rounds[rounds.length - 1] ?? "");
  const [eventsById, setEventsById] = useState<Record<number, FixtureEvents>>({});

  const active = byRound.has(sel) ? sel : rounds[rounds.length - 1];
  const list = [...(byRound.get(active) ?? [])].sort(
    (a, b) =>
      new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime(),
  );
  const activeIds = list.map((fx) => fx.fixture.id).join(",");

  useEffect(() => {
    const ids = activeIds
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((id) => !(id in eventsById));
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
  }, [activeIds, eventsById]);

  if (done.length === 0) {
    return <Empty>Aún no hay partidos finalizados — el primero cae pronto.</Empty>;
  }

  return (
    <div>
      <label className="mb-6" style={{ display: "block" }}>
        <span
          className="mono"
          style={{
            display: "block",
            fontSize: "0.6rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-dim)",
            marginBottom: 6,
          }}
        >
          Jornada
        </span>
        <select
          className="field"
          value={active}
          onChange={(e) => setSel(e.target.value)}
          style={{ maxWidth: 280 }}
        >
          {rounds.map((r) => (
            <option key={r} value={r}>
              {roundMeta(r).label} ({byRound.get(r)!.length})
            </option>
          ))}
        </select>
      </label>
      <div className="grid2">
        {list.map((fx) => (
          <FinishedCard
            key={fx.fixture.id}
            competition={competition}
            fx={fx}
            ev={eventsById[fx.fixture.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

export function FinishedCard({
  competition,
  fx,
  ev,
}: {
  competition: Competition;
  fx: Fixture;
  ev: FixtureEvents | null;
}) {
  const base = basePath(competition);
  return (
    <Link
      href={`${base}/partido/${fx.fixture.id}`}
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

/* ---------- Tabla (standingsMode: "table") ---------- */

export function StandingsTableView({
  competition,
  standings,
}: {
  competition: Competition;
  standings: StandingRow[];
}) {
  const base = basePath(competition);
  if (standings.length === 0) {
    return <Empty>La tabla aparecerá en cuanto arranque la temporada.</Empty>;
  }
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th className="text-right">PJ</th>
            <th className="hidden text-right sm:table-cell">G</th>
            <th className="hidden text-right sm:table-cell">E</th>
            <th className="hidden text-right sm:table-cell">P</th>
            <th className="text-right">DG</th>
            <th className="text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r) => (
            <tr key={r.team.id}>
              <td className="pos">
                <RankPill rank={r.rank} />
              </td>
              <td className="who">
                <Link
                  href={`${base}/equipo/${r.team.id}`}
                  className="flex items-center gap-2"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <Image src={r.team.logo} alt="" width={22} height={22} unoptimized />
                  {r.team.name}
                </Link>
                {r.form && <FormMini form={r.form} />}
              </td>
              <td className="text-right tabular-nums" style={{ color: "var(--text-dim)" }}>
                {r.all.played}
              </td>
              <td
                className="hidden text-right tabular-nums sm:table-cell"
                style={{ color: "var(--text-dim)" }}
              >
                {r.all.win}
              </td>
              <td
                className="hidden text-right tabular-nums sm:table-cell"
                style={{ color: "var(--text-dim)" }}
              >
                {r.all.draw}
              </td>
              <td
                className="hidden text-right tabular-nums sm:table-cell"
                style={{ color: "var(--text-dim)" }}
              >
                {r.all.lose}
              </td>
              <td
                className="text-right tabular-nums"
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
              <td className="pts">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Jugadores ---------- */

const POS_SHORT: Record<string, string> = {
  Goalkeeper: "POR",
  Defender: "DEF",
  Midfielder: "MED",
  Attacker: "DEL",
};

function groupPlayersByTeam(
  players: AllPlayer[],
): { team: { name: string; logo: string }; players: AllPlayer[] }[] {
  const map = new Map<string, { team: { name: string; logo: string }; players: AllPlayer[] }>();
  for (const p of players) {
    if (!p.team) continue;
    const g = map.get(p.team.name) ?? { team: p.team, players: [] };
    g.players.push(p);
    map.set(p.team.name, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, players: g.players.sort((a, b) => a.name.localeCompare(b.name, "es")) }))
    .sort((a, b) => a.team.name.localeCompare(b.team.name, "es"));
}

function PlayerRow({
  competition,
  p,
  last,
  withTeam,
}: {
  competition: Competition;
  p: AllPlayer;
  last: boolean;
  withTeam?: boolean;
}) {
  const base = basePath(competition);
  return (
    <Link
      href={`${base}/jugador/${p.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderBottom: last ? undefined : "1px solid var(--line)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span style={{ fontWeight: 600, minWidth: 0, flex: 1 }} className="truncate">
        {p.name}
      </span>
      {withTeam && p.team && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Image src={p.team.logo} alt="" width={18} height={18} unoptimized />
          <span className="mono truncate" style={{ color: "var(--text-dim)", fontSize: "0.66rem", maxWidth: 110 }}>
            {p.team.name}
          </span>
        </span>
      )}
      {!withTeam && p.position && (
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.62rem", flexShrink: 0 }}>
          {POS_SHORT[p.position] ?? ""}
        </span>
      )}
    </Link>
  );
}

export function JugadoresView({ competition }: { competition: Competition }) {
  const [players, setPlayers] = useState<AllPlayer[] | null>(null);
  const [q, setQ] = useState("");
  const [live, setLive] = useState<AllPlayer[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sports/all-players?competition=${competition.slug}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: AllPlayer[]) => {
        if (!cancelled) setPlayers(Array.isArray(d) ? d : []);
      })
      .catch(() => {
        if (!cancelled) setPlayers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [competition.slug]);

  const term = q.trim();
  const liveMode = term.length >= 3;

  useEffect(() => {
    if (!liveMode) {
      setLive([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(() => {
      fetch(`/api/sports/search-players?q=${encodeURIComponent(term)}&competition=${competition.slug}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d: AllPlayer[]) => {
          if (!cancelled) setLive(Array.isArray(d) ? d : []);
        })
        .catch(() => {
          if (!cancelled) setLive([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [term, liveMode, competition.slug]);

  if (players === null) {
    return (
      <div className="space-y-2" aria-busy>
        <SkeletonBar className="h-10 w-full" />
        <SkeletonBar className="h-12 w-full" />
        <SkeletonBar className="h-12 w-full" />
        <SkeletonBar className="h-12 w-full" />
      </div>
    );
  }

  const byTeam = groupPlayersByTeam(players);

  return (
    <div>
      <ListSearch value={q} onChange={setQ} placeholder="Buscar jugador…" />

      {liveMode ? (
        <>
          {searching && live.length === 0 ? (
            <p className="mono" style={{ color: "var(--text-dim)", fontSize: "0.66rem", padding: "6px 2px" }}>
              Buscando…
            </p>
          ) : live.length === 0 ? (
            <Empty>Sin jugadores para “{term}”.</Empty>
          ) : (
            <div className="panel" style={{ overflow: "hidden" }}>
              {live.map((p, i) => (
                <PlayerRow key={p.id} competition={competition} p={p} last={i === live.length - 1} withTeam />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mono" style={{ color: "var(--text-dim)", fontSize: "0.62rem", margin: "0 0 12px" }}>
            {players.length} jugadores · agrupados por equipo · o escribe un nombre para buscar
          </p>
          <div className="space-y-2">
            {byTeam.map((g) => (
              <details key={g.team.name} className="panel" style={{ overflow: "hidden" }}>
                <summary
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    cursor: "pointer",
                    listStyle: "none",
                    userSelect: "none",
                  }}
                >
                  <Image src={g.team.logo} alt="" width={24} height={24} unoptimized />
                  <b style={{ flex: 1, minWidth: 0 }} className="truncate">{g.team.name}</b>
                  <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.66rem" }}>
                    {g.players.length}
                  </span>
                </summary>
                <div style={{ borderTop: "1px solid var(--line)" }}>
                  {g.players.map((p, i) => (
                    <PlayerRow key={p.id} competition={competition} p={p} last={i === g.players.length - 1} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Récords ---------- */

function RecordMatch({
  competition,
  fx,
  tag,
}: {
  competition: Competition;
  fx: Fixture;
  tag: string;
}) {
  const base = basePath(competition);
  const { home, away } = fx.teams;
  return (
    <Link
      href={`${base}/partido/${fx.fixture.id}`}
      className="panel"
      style={{ display: "block", padding: "12px 14px", textDecoration: "none", color: "inherit" }}
    >
      <p
        className="mono"
        style={{
          color: "var(--accent)",
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: "0 0 8px",
        }}
      >
        {tag}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <Image src={home.logo} alt="" width={20} height={20} unoptimized />
          <span className="truncate" style={{ fontWeight: home.winner ? 700 : 500 }}>{home.name}</span>
        </span>
        <b className="tabular-nums" style={{ fontSize: "1.1rem", flexShrink: 0 }}>
          {fx.goals.home ?? 0}–{fx.goals.away ?? 0}
        </b>
        <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, justifyContent: "flex-end" }}>
          <span className="truncate" style={{ fontWeight: away.winner ? 700 : 500, textAlign: "right" }}>{away.name}</span>
          <Image src={away.logo} alt="" width={20} height={20} unoptimized />
        </span>
      </div>
    </Link>
  );
}

function GameRecordRow({
  competition,
  rec,
  label,
  suffix,
}: {
  competition: Competition;
  rec: NonNullable<GameRecords["topPossession"]>;
  label: string;
  suffix?: string;
}) {
  const base = basePath(competition);
  return (
    <Link
      href={`${base}/partido/${rec.fixtureId}`}
      className="panel"
      style={{ display: "block", padding: "11px 14px", textDecoration: "none", color: "inherit" }}
    >
      <p
        className="mono"
        style={{
          color: "var(--accent)",
          fontSize: "0.58rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: "0 0 8px",
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <Image src={rec.team.logo} alt="" width={20} height={20} unoptimized />
          <span className="truncate" style={{ fontWeight: 700 }}>{rec.team.name}</span>
        </span>
        <b className="tabular-nums" style={{ fontSize: "1.05rem", flexShrink: 0, color: "var(--accent)" }}>
          {rec.value}
          {suffix ?? ""}
        </b>
      </div>
      <p className="mono" style={{ color: "var(--text-dim)", fontSize: "0.6rem", margin: "6px 0 0" }}>
        vs {rec.rival.name} · {rec.score}
      </p>
    </Link>
  );
}

function GameRecordsSection({ competition }: { competition: Competition }) {
  const [gr, setGr] = useState<GameRecords | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sports/game-records?competition=${competition.slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: GameRecords | null) => {
        if (!cancelled) setGr(d);
      })
      .catch(() => {
        if (!cancelled) setGr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [competition.slug]);

  if (!gr || (!gr.topPossession && !gr.topShots && !gr.topShotsOnTarget)) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        marginTop: 12,
      }}
    >
      {gr.topPossession && <GameRecordRow competition={competition} rec={gr.topPossession} label="Más posesión" suffix="%" />}
      {gr.topShots && <GameRecordRow competition={competition} rec={gr.topShots} label="Más tiros" />}
      {gr.topShotsOnTarget && (
        <GameRecordRow competition={competition} rec={gr.topShotsOnTarget} label="Más tiros a puerta" />
      )}
    </div>
  );
}

/** Adaptación de un metric-card reutilizable (usado también fuera de récords). */
function MetricCard({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div style={{ background: "var(--surface-2)", borderRadius: "var(--radius)", padding: "12px 14px" }}>
      <div
        className="tabular-nums"
        style={{
          fontFamily: "var(--font-display-stack)",
          fontWeight: 900,
          fontSize: "1.5rem",
          lineHeight: 1,
          color: accent ? "var(--accent)" : "var(--text)",
        }}
      >
        {value}
      </div>
      <div
        className="mono"
        style={{ marginTop: 6, fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)" }}
      >
        {label}
      </div>
    </div>
  );
}

/** Fila compacta de "equipo más goleador/goleado" (derivado de la tabla). */
function TeamGoalRow({ label, row }: { label: string; row: StandingRow }) {
  return (
    <div className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 14px" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <Image src={row.team.logo} alt="" width={20} height={20} unoptimized />
        <span className="truncate" style={{ fontWeight: 700 }}>{row.team.name}</span>
      </span>
      <span style={{ textAlign: "right", flexShrink: 0 }}>
        <b className="tabular-nums" style={{ fontSize: "1.05rem", color: "var(--accent)" }}>
          {label === "goleador" ? row.all.goals.for : row.all.goals.against}
        </b>
        <span className="mono" style={{ display: "block", color: "var(--text-dim)", fontSize: "0.58rem", textTransform: "uppercase" }}>
          {label === "goleador" ? "Más goleador" : "Más goleado"}
        </span>
      </span>
    </div>
  );
}

export function RecordsPanel({
  competition,
  records,
  standings,
}: {
  competition: Competition;
  records: TournamentRecords;
  standings: StandingRow[];
}) {
  const goalLeaders = useMemo(
    () => teamGoalLeaders([{ group: "", rows: standings }]),
    [standings],
  );

  return (
    <div>
      <div className="shead">
        <h2>Récords de la temporada</h2>
        <span className="sh-note">{records.matchesPlayed} partidos jugados</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <MetricCard value={records.totalGoals} label="Goles totales" accent />
        <MetricCard value={records.avgGoals.toFixed(2)} label="Media por partido" />
        <MetricCard value={records.penShootouts} label="Tandas de penaltis" />
        <MetricCard value={records.scorelessDraws} label="Partidos sin goles" />
      </div>
      {(records.biggestWin || records.mostGoals) && (
        <div className="grid2" style={{ alignItems: "start", marginBottom: 16 }}>
          {records.biggestWin && <RecordMatch competition={competition} fx={records.biggestWin} tag="Mayor goleada" />}
          {records.mostGoals && <RecordMatch competition={competition} fx={records.mostGoals} tag="Más goles en un partido" />}
        </div>
      )}
      {(goalLeaders.mostScoring || goalLeaders.mostConceded) && (
        <div className="grid2" style={{ alignItems: "start", marginBottom: 4 }}>
          {goalLeaders.mostScoring && <TeamGoalRow label="goleador" row={goalLeaders.mostScoring} />}
          {goalLeaders.mostConceded && <TeamGoalRow label="goleado" row={goalLeaders.mostConceded} />}
        </div>
      )}
      <GameRecordsSection competition={competition} />
    </div>
  );
}

/* ---------- Estadísticas ---------- */

export type LigaStatsData = {
  scorers: PlayerStatLeader[];
  assists: PlayerStatLeader[];
  ratings: PlayerStatLeader[];
  cards: PlayerStatLeader[];
  attackDefense: { attack: StandingRow[]; defense: StandingRow[] };
  standings: StandingRow[];
  finished: Fixture[];
};

export function StatsView({
  competition,
  data,
}: {
  competition: Competition;
  data: LigaStatsData;
}) {
  const base = basePath(competition);
  const { scorers, assists, ratings, cards, attackDefense, standings, finished } = data;
  const [openId, setOpenId] = useState<number | null>(null);
  const records = useMemo(() => tournamentRecords(finished), [finished]);

  return (
    <div className="space-y-8">
      {openId != null && (
        <PlayerSeasonModal competition={competition} id={openId} onClose={() => setOpenId(null)} />
      )}
      {records.matchesPlayed > 0 && (
        <RecordsPanel competition={competition} records={records} standings={standings} />
      )}
      <Link
        href={`${base}/comparar`}
        className="panel"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 18px",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <span>
          <b>Comparador de equipos</b>
          <span
            className="mono"
            style={{
              display: "block",
              color: "var(--text-dim)",
              fontSize: "0.66rem",
              marginTop: 2,
            }}
          >
            Enfrenta dos equipos estadística a estadística
          </span>
        </span>
        <span style={{ color: "var(--accent)" }}>Comparar →</span>
      </Link>

      {(attackDefense.attack.length > 0 || attackDefense.defense.length > 0) && (
        <div className="grid2" style={{ alignItems: "start" }}>
          <div>
            <div className="shead">
              <h2>Mejor ataque</h2>
              <span className="sh-note">goles a favor</span>
            </div>
            <TeamMiniTable competition={competition} rows={attackDefense.attack} metric="gf" />
          </div>
          <div>
            <div className="shead">
              <h2>Mejor defensa</h2>
              <span className="sh-note">goles en contra</span>
            </div>
            <TeamMiniTable competition={competition} rows={attackDefense.defense} metric="gc" />
          </div>
        </div>
      )}

      <div>
        <div className="shead">
          <h2>Tabla de goleadores</h2>
        </div>
        {scorers.length > 0 ? (
          <PlayerTable competition={competition} players={scorers} metric="goals" onPick={setOpenId} />
        ) : (
          <Empty>
            El proveedor publica las estadísticas de jugadores con algo de retraso — aparecerán solas.
          </Empty>
        )}
      </div>

      <div>
        <div className="shead">
          <h2>Tabla de asistidores</h2>
        </div>
        {assists.length > 0 ? (
          <PlayerTable competition={competition} players={assists} metric="assists" onPick={setOpenId} />
        ) : (
          <Empty>Igual que los goleadores: en cuanto el API los publique, aquí estarán.</Empty>
        )}
      </div>

      <div>
        <div className="shead">
          <h2>Valoración por jugador</h2>
          <span className="sh-note">nota media · entre los destacados</span>
        </div>
        {ratings.length > 0 ? (
          <PlayerTable competition={competition} players={ratings} metric="rating" onPick={setOpenId} />
        ) : (
          <Empty>Se calcula con la nota media que publica el API — llegará con las tablas de arriba.</Empty>
        )}
      </div>

      {cards.length > 0 && (
        <div>
          <div className="shead">
            <h2>Tarjetas</h2>
            <span className="sh-note">los más amonestados de la temporada</span>
          </div>
          <PlayerTable competition={competition} players={cards} metric="cards" onPick={setOpenId} />
        </div>
      )}
    </div>
  );
}

export function PlayerTable({
  competition,
  players,
  metric,
  onPick,
}: {
  competition: Competition;
  players: PlayerStatLeader[];
  metric: "goals" | "assists" | "rating" | "cards";
  onPick: (id: number) => void;
}) {
  const base = basePath(competition);
  const label =
    metric === "goals"
      ? "Goles"
      : metric === "assists"
        ? "Asist."
        : metric === "cards"
          ? "Tarjetas"
          : "Nota";
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>Equipo</th>
            <th className="hidden text-right sm:table-cell">PJ</th>
            <th className="hidden text-right sm:table-cell">Min</th>
            <th className="text-right">{label}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => {
            const st = p.statistics[0];
            const yellow = st?.cards?.yellow ?? 0;
            const red = (st?.cards?.red ?? 0) + (st?.cards?.yellowred ?? 0);
            const value =
              metric === "goals"
                ? (st?.goals.total ?? 0)
                : metric === "assists"
                  ? (st?.goals.assists ?? 0)
                  : metric === "cards"
                    ? `${yellow}🟨${red > 0 ? ` ${red}🟥` : ""}`
                    : st?.games.rating
                      ? parseFloat(st.games.rating).toFixed(2)
                      : "—";
            return (
              <tr
                key={p.player.id}
                onClick={() => onPick(p.player.id)}
                style={{ cursor: "pointer" }}
                title={`Ver estadísticas de ${p.player.name}`}
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
                  {st?.team.id ? (
                    <Link
                      href={`${base}/equipo/${st.team.id}`}
                      className="flex items-center gap-2"
                      style={{ color: "var(--text-dim)", textDecoration: "none" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {st.team.logo && (
                        <Image src={st.team.logo} alt="" width={18} height={18} unoptimized />
                      )}
                      {st.team.name}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
                      {st?.team.name}
                    </span>
                  )}
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
  competition,
  id,
  onClose,
}: {
  competition: Competition;
  id: number;
  onClose: () => void;
}) {
  type Payload = { season: PlayerSeason | null; extras: PlayerExtras };
  const [p, setP] = useState<Payload | null | "loading">("loading");
  useEffect(() => {
    let cancelled = false;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    fetch(`/api/sports/player?id=${id}&competition=${competition.slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Payload | null) => {
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
  }, [id, onClose, competition.slug]);

  return (
    <div className="pmodal-backdrop" onClick={onClose} role="dialog" aria-modal>
      <div className="pmodal" onClick={(e) => e.stopPropagation()}>
        {p === "loading" ? (
          <div className="space-y-3" style={{ padding: "8px 0" }} aria-busy>
            <SkeletonBar className="h-16 w-16 rounded-full" />
            <SkeletonBar className="h-5 w-40" />
            <SkeletonBar className="h-3 w-28" />
            <SkeletonBar className="h-24 w-full" />
          </div>
        ) : !p || (!p.season && p.extras.trophies.length === 0) ? (
          <p style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)" }}>
            Aún no hay estadísticas de este jugador.
          </p>
        ) : (
          <>
            {p.season && <SeasonContent p={p.season} />}
            <PlayerExtrasBlock extras={p.extras} />
          </>
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
        Totales de la temporada
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

export function TeamMiniTable({
  competition,
  rows,
  metric,
}: {
  competition: Competition;
  rows: StandingRow[];
  metric: "gf" | "gc";
}) {
  const base = basePath(competition);
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <table className="board">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th className="hidden text-right sm:table-cell">PJ</th>
            <th className="text-right">{metric === "gf" ? "GF" : "GC"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id}>
              <td className="pos">{i + 1}</td>
              <td className="who">
                <Link
                  href={`${base}/equipo/${r.team.id}`}
                  className="flex items-center gap-2"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <Image
                    src={r.team.logo}
                    alt=""
                    width={22}
                    height={22}
                    unoptimized
                  />
                  {r.team.name}
                </Link>
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
