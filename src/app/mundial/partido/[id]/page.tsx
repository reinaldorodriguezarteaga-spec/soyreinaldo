import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFixtureById,
  getFixtureCards,
  getFixtureGoals,
  getFixtureLineups,
  getFixturePlayers,
  getFixtureStatistics,
  isFinal,
  isLive,
  type FixtureGoal,
} from "@/lib/sports/api-football";
import PlayerRatings from "./player-ratings";

export const metadata = {
  title: "Estadísticas del partido | Mundial 2026 | Soy Reinaldo",
};

const MADRID_TZ = "Europe/Madrid";

function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Estadísticas a mostrar (tipo del API → etiqueta ES, en orden).
const STAT_ROWS: { type: string; label: string; pct?: boolean }[] = [
  { type: "Ball Possession", label: "Posesión", pct: true },
  { type: "Total Shots", label: "Tiros" },
  { type: "Shots on Goal", label: "Tiros a puerta" },
  { type: "expected_goals", label: "xG (goles esperados)" },
  { type: "Corner Kicks", label: "Córners" },
  { type: "Fouls", label: "Faltas" },
  { type: "Yellow Cards", label: "Amarillas" },
  { type: "Red Cards", label: "Rojas" },
  { type: "Goalkeeper Saves", label: "Paradas" },
  { type: "Total passes", label: "Pases" },
];

function toNum(v: number | string | null): number {
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Un evento bajo el equipo (gol o expulsión). */
type Ev = {
  icon: string;
  minute: number | null;
  player: string;
  tag: string;
  assist: string | null;
};

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixtureId = Number(id);
  if (!Number.isFinite(fixtureId)) notFound();

  const [fx, goals, cards, stats, players, lineups] = await Promise.all([
    getFixtureById(fixtureId),
    getFixtureGoals(fixtureId),
    getFixtureCards(fixtureId),
    getFixtureStatistics(fixtureId),
    getFixturePlayers(fixtureId),
    getFixtureLineups(fixtureId),
  ]);
  if (!fx) notFound();

  const home = fx.teams.home;
  const away = fx.teams.away;
  const live = isLive(fx);
  const final = isFinal(fx);
  const played = live || final;

  // Goles y expulsiones bajo cada equipo (el autogol cuenta para el rival).
  const benefTeam = (g: FixtureGoal) =>
    g.detail === "Own Goal"
      ? g.teamId === home.id
        ? away.id
        : home.id
      : g.teamId;
  const linesFor = (teamId: number): Ev[] => {
    const gs: Ev[] = goals
      .filter((g) => benefTeam(g) === teamId)
      .map((g) => ({
        icon: "⚽",
        minute: g.minute,
        player: g.player,
        tag:
          g.detail === "Penalty"
            ? "(pen.)"
            : g.detail === "Own Goal"
              ? "(p.p.)"
              : "",
        assist: g.assist,
      }));
    const rs: Ev[] = cards
      .filter((c) => c.expulsion && c.teamId === teamId)
      .map((c) => ({
        icon: "🟥",
        minute: c.minute,
        player: c.player,
        tag: /second/i.test(c.detail) ? "(2ª am.)" : "",
        assist: null,
      }));
    return [...gs, ...rs].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  };
  const homeLines = linesFor(home.id);
  const awayLines = linesFor(away.id);
  const hasLines = homeLines.length > 0 || awayLines.length > 0;

  const homeStats = stats.find((s) => s.team.id === home.id);
  const awayStats = stats.find((s) => s.team.id === away.id);
  const val = (
    s: typeof homeStats,
    type: string,
  ): number | string | null =>
    s?.statistics.find((x) => x.type === type)?.value ?? null;
  const rows = STAT_ROWS.map((r) => ({
    label: r.label,
    pct: r.pct,
    home: val(homeStats, r.type),
    away: val(awayStats, r.type),
  })).filter((r) => r.home != null || r.away != null);

  const homePlayers =
    players.find((t) => t.team.id === home.id)?.players ?? [];
  const awayPlayers =
    players.find((t) => t.team.id === away.id)?.players ?? [];
  const homeLineup = lineups.find((l) => l.teamId === home.id) ?? null;
  const awayLineup = lineups.find((l) => l.teamId === away.id) ?? null;
  const hasRatings = homePlayers.length > 0 || awayPlayers.length > 0;

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <Link
            href="/mundial?v=finalizados"
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Resultados
          </Link>

          <div className="panel" style={{ marginTop: 16, padding: "24px 20px" }}>
            <div className="match__meta" style={{ marginBottom: 14 }}>
              <span className="match__grp">{fx.league.round}</span>
              {live ? (
                <span className="badge badge--danger">
                  <span className="livepulse" />
                  {fx.fixture.status.elapsed != null
                    ? `${fx.fixture.status.elapsed}'`
                    : "EN VIVO"}
                </span>
              ) : final ? (
                <span className="badge">Final</span>
              ) : (
                <span className="match__when">Por jugarse</span>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "start",
                gap: 12,
              }}
            >
              <div>
                <TeamHead team={home} winner={home.winner} />
                <EvList lines={homeLines} align="left" />
              </div>
              <div
                className="display"
                style={{ fontSize: "2.6rem", whiteSpace: "nowrap", paddingTop: 8 }}
              >
                {played ? (
                  <>
                    {fx.goals.home ?? 0}
                    <span style={{ color: "var(--text-dim)", margin: "0 10px" }}>
                      –
                    </span>
                    {fx.goals.away ?? 0}
                  </>
                ) : (
                  <span style={{ color: "var(--text-dim)", fontSize: "1.4rem" }}>
                    VS
                  </span>
                )}
              </div>
              <div>
                <TeamHead team={away} winner={away.winner} />
                <EvList lines={awayLines} align="right" />
              </div>
            </div>

            <p
              className="match__when"
              style={{
                textAlign: "center",
                marginTop: hasLines ? 18 : 16,
                paddingTop: 14,
                borderTop: "1px solid var(--line)",
              }}
            >
              {formatKickoff(fx.fixture.date)}
              {fx.fixture.venue?.name ? ` · ${fx.fixture.venue.name}` : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="shead">
            <h2>Estadísticas</h2>
          </div>
          {rows.length > 0 ? (
            <div className="panel" style={{ padding: "18px 20px" }}>
              {rows.map((r) => (
                <StatRow key={r.label} row={r} />
              ))}
            </div>
          ) : (
            <div
              className="panel"
              style={{
                padding: 28,
                textAlign: "center",
                borderStyle: "dashed",
                color: "var(--text-dim)",
              }}
            >
              {played
                ? "Las estadísticas de este partido aún no están publicadas por el proveedor — suelen tardar un rato tras el pitido final."
                : "Las estadísticas estarán disponibles cuando se juegue el partido."}
            </div>
          )}

          {hasRatings && (
            <div style={{ marginTop: 28 }}>
              <PlayerRatings
                home={{ id: home.id, name: home.name, logo: home.logo }}
                away={{ id: away.id, name: away.name, logo: away.logo }}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                homeLineup={homeLineup}
                awayLineup={awayLineup}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function TeamHead({
  team,
  winner,
}: {
  team: { name: string; logo: string };
  winner: boolean | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: winner === false ? 0.6 : 1,
      }}
    >
      <Image src={team.logo} alt="" width={48} height={48} unoptimized />
      <span style={{ fontWeight: 700, textAlign: "center", fontSize: "0.95rem" }}>
        {team.name}
      </span>
    </div>
  );
}

function EvList({ lines, align }: { lines: Ev[]; align: "left" | "right" }) {
  if (lines.length === 0) return null;
  const right = align === "right";
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
      {lines.map((e, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 6,
            alignItems: "baseline",
            justifyContent: right ? "flex-end" : "flex-start",
            flexWrap: "wrap",
            fontSize: "0.84rem",
            textAlign: right ? "right" : "left",
          }}
        >
          {right ? (
            <>
              <Name e={e} />
              <Min minute={e.minute} />
              <span>{e.icon}</span>
            </>
          ) : (
            <>
              <span>{e.icon}</span>
              <Min minute={e.minute} />
              <Name e={e} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Min({ minute }: { minute: number | null }) {
  return (
    <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.74rem" }}>
      {minute != null ? `${minute}'` : ""}
    </span>
  );
}

function Name({ e }: { e: Ev }) {
  return (
    <span>
      {e.player}
      {e.tag ? <span style={{ color: "var(--text-dim)" }}> {e.tag}</span> : null}
      {e.assist ? (
        <span style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
          {" "}
          · {e.assist}
        </span>
      ) : null}
    </span>
  );
}

function StatRow({
  row,
}: {
  row: {
    label: string;
    pct?: boolean;
    home: number | string | null;
    away: number | string | null;
  };
}) {
  const hRaw = row.home ?? (row.pct ? "0%" : 0);
  const aRaw = row.away ?? (row.pct ? "0%" : 0);
  const h = toNum(row.home);
  const a = toNum(row.away);
  const total = h + a;
  const hPct = total > 0 ? (h / total) * 100 : 50;
  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
          fontSize: "0.9rem",
        }}
      >
        <b className="tabular-nums">{String(hRaw)}</b>
        <span
          className="mono"
          style={{
            color: "var(--text-dim)",
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {row.label}
        </span>
        <b className="tabular-nums">{String(aRaw)}</b>
      </div>
      <div
        style={{
          display: "flex",
          height: 5,
          borderRadius: 3,
          overflow: "hidden",
          background: "var(--surface-2)",
        }}
      >
        <span style={{ width: `${hPct}%`, background: "var(--accent)" }} />
        <span
          style={{ width: `${100 - hPct}%`, background: "var(--line-strong)" }}
        />
      </div>
    </div>
  );
}
