import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFixtureById,
  getFixtureCards,
  getFixtureGoals,
  getFixtureLineups,
  getFixtureNotes,
  getFixturePlayers,
  getFixtureStatistics,
  getFixtureSubs,
  isFinal,
  isLive,
  reconcileGoals,
  subKey,
  getCompetitionStandings,
  type Fixture,
  type FixtureGoal,
  type StandingRow,
  getTeamVenue,
  type TeamVenue,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import JsonLd, { absolute } from "@/lib/seo/json-ld";
import StandingsImpact from "./standings-impact";
import MatchQuiniela from "./match-quiniela";
import MatchAnalisis from "./match-analisis";
import PlayerRatings from "./player-ratings";
import LiveRefresh from "./live-refresh";
import Countdown from "./countdown";
import MatchTabs from "./match-tabs";

/**
 * Etiqueta ES de una ronda. Sin config por competición: LaLiga solo tiene
 * jornadas de liga regular ("Regular Season - N" → "Jornada N"); si el
 * string no matchea ese patrón se muestra tal cual en vez de fallar (cubre
 * futuras competiciones KO sin necesidad de tocar este archivo).
 */
function roundLabelEs(round: string | null, competitionName: string): string {
  if (!round) return competitionName;
  const g = round.match(/Regular Season\s*-\s*(\d+)/i);
  if (g) return `Jornada ${g[1]}`;
  return round;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  const fixtureId = Number(id);
  const fx = await getFixtureById(fixtureId, 60).catch(() => null);
  if (!fx) return { title: `Partido · ${competition.name} | Soy Reinaldo` };
  const home = fx.teams.home.name;
  const away = fx.teams.away.name;
  const played = isLive(fx) || isFinal(fx);
  const middle = played ? `${fx.goals.home ?? 0}–${fx.goals.away ?? 0}` : "vs";
  const round = roundLabelEs(fx.league.round, competition.name);
  const title = `${home} ${middle} ${away} · ${round} · ${competition.name}`;
  const description = played
    ? `Marcador, estadísticas, alineaciones y valoraciones de ${home} contra ${away} (${round}) en ${competition.name}.`
    : `Previa, probabilidades y cuenta atrás de ${home} contra ${away} (${round}) en ${competition.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/liga/${slug}/partido/${id}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** schema.org/SportsEvent — lo que permite a Google enseñar el marcador
 * directamente en los resultados de búsqueda.
 *
 * Search Console (24-ago) marcó como CRÍTICO "falta el campo location": la
 * API deja `fixture.venue` vacío en muchas jornadas por disputar (111 de 380
 * en LaLiga 26-27). Sin sede no hay resultado enriquecido, así que se
 * completa con el estadio del equipo local —que es donde se juega, no un
 * invento— y, si ni aun así se sabe, no se emiten datos estructurados: mejor
 * ninguno que unos incompletos.
 *
 * `offers` se queda fuera A PROPÓSITO aunque Google lo sugiera: no vendemos
 * entradas, y declarar una oferta que no existe sería mentirle a Google.
 */
function matchJsonLd(
  fx: Fixture,
  competition: Competition,
  played: boolean,
  sedeDeRespaldo: TeamVenue | null,
): Record<string, unknown> | null {
  const home = fx.teams.home;
  const away = fx.teams.away;
  const equipo = (t: { name: string; logo: string }) => ({
    "@type": "SportsTeam",
    name: t.name,
    logo: t.logo,
  });

  const sede = fx.fixture.venue.name
    ? { name: fx.fixture.venue.name, city: fx.fixture.venue.city ?? null }
    : sedeDeRespaldo;
  // Sin sede no hay evento válido para Google: preferimos no publicar datos
  // estructurados a publicarlos rotos.
  if (!sede) return null;

  // Un partido de fútbol dura 90 minutos más descanso y añadido: dos horas es
  // la estimación estándar, y Google acepta una hora de fin aproximada.
  const fin = new Date(new Date(fx.fixture.date).getTime() + 2 * 60 * 60 * 1000);

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${home.name} - ${away.name}`,
    description: `${home.name} contra ${away.name} en ${competition.name}.`,
    startDate: fx.fixture.date,
    endDate: fin.toISOString(),
    eventStatus:
      fx.fixture.status.short === "PST"
        ? "https://schema.org/EventPostponed"
        : fx.fixture.status.short === "CANC"
          ? "https://schema.org/EventCancelled"
          : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Soccer",
    url: absolute(`/liga/${competition.slug}/partido/${fx.fixture.id}`),
    image: [home.logo, away.logo].filter(Boolean),
    location: {
      "@type": "Place",
      name: sede.name,
      ...(sede.city
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: sede.city,
            },
          }
        : {}),
    },
    homeTeam: equipo(home),
    awayTeam: equipo(away),
    competitor: [equipo(home), equipo(away)],
    // Quien "actúa" en un partido son los dos equipos.
    performer: [equipo(home), equipo(away)],
    organizer: { "@type": "SportsOrganization", name: competition.name },
    superEvent: { "@type": "SportsOrganization", name: competition.name },
    ...(played
      ? {
          // El marcador, en el formato que Google sabe leer.
          subEvent: [],
          award: `${fx.goals.home ?? 0}-${fx.goals.away ?? 0}`,
        }
      : {}),
  };
}

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

/** Un evento bajo el equipo (gol, expulsión, pen. fallado, gol anulado…). */
type Ev = {
  icon: string;
  minute: number | null;
  player: string;
  tag: string;
  assist: string | null;
  /** true para eventos que NO cuentan (pen. fallado, gol anulado) → atenuados. */
  muted?: boolean;
};

export default async function LigaPartidoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const competition: Competition | undefined = COMPETITIONS_BY_SLUG[slug];
  if (!competition) notFound();

  const fixtureId = Number(id);
  if (!Number.isFinite(fixtureId)) notFound();

  // Primero el partido (caché corta) para saber si está en juego; si lo está,
  // el resto se pide con caché corta y se auto-refresca la página.
  const fx = await getFixtureById(fixtureId, 15);
  if (!fx) notFound();
  const liveNow = isLive(fx);
  const rv = liveNow ? 15 : undefined; // undefined = caché por defecto del fetcher

  const [rawGoals, cards, stats, players, lineups, notes, subs] =
    await Promise.all([
      getFixtureGoals(fixtureId, rv),
      getFixtureCards(fixtureId, rv),
      getFixtureStatistics(fixtureId, rv),
      getFixturePlayers(fixtureId, rv),
      getFixtureLineups(fixtureId, rv),
      getFixtureNotes(fixtureId, rv),
      getFixtureSubs(fixtureId, rv),
    ]);
  const cameInKeys = new Set(subs.inKeys);

  // Descarta goles anulados/fantasma reconciliando con el marcador real.
  const goals = reconcileGoals(rawGoals, {
    homeId: fx.teams.home.id,
    awayId: fx.teams.away.id,
    scoreHome: fx.goals.home,
    scoreAway: fx.goals.away,
  });

  // A diferencia de /mundial (selecciones), en las ligas de clubes los
  // nombres que da API-Football ya son los correctos — sin mapa ES/bandera
  // (ese mecanismo lee `matches`/`teams` de la BD de la quiniela, que nunca
  // tuvo partidos de clubes).
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
    // Eventos que NO cuentan al marcador: penalti fallado / gol anulado (VAR).
    const ns: Ev[] = notes
      .filter((n) => n.teamId === teamId)
      .map((n) => ({
        icon: n.kind === "missed_penalty" ? "❌" : "🚫",
        minute: n.minute,
        player: n.player,
        tag: n.kind === "missed_penalty" ? "(pen. fallado)" : "(gol anulado)",
        assist: null,
        muted: true,
      }));
    return [...gs, ...rs, ...ns].sort(
      (a, b) => (a.minute ?? 0) - (b.minute ?? 0),
    );
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
  // Clasificación proyectada: solo tiene sentido antes de jugarse y en
  // competiciones con tabla. Sale de `sports_cache`, no gasta cuota.
  const standings =
    !played && competition.standingsMode === "table"
      ? await getCompetitionStandings(competition).catch(() => null)
      : null;
  const standingsRows = Array.isArray(standings)
    ? (standings as StandingRow[]).filter(
        (r): r is StandingRow => "rank" in r && "points" in r,
      )
    : [];

  const homeLineup = lineups.find((l) => l.teamId === home.id) ?? null;
  const awayLineup = lineups.find((l) => l.teamId === away.id) ?? null;
  const hasRatings = homePlayers.length > 0 || awayPlayers.length > 0;
  // Los onces se publican ~1h antes del pitido; las valoraciones, con el
  // partido ya andando. Entre lo uno y lo otro, lo que la gente busca es la
  // alineación — se pinta el mismo campo, sin notas.
  const hasLineups = !!(homeLineup?.startXI.length && awayLineup?.startXI.length);

  const base = `/liga/${competition.slug}`;

  // Si el partido no trae estadio, el del equipo local (ahí se juega). Solo se
  // consulta cuando falta, y la respuesta se cachea 30 días.
  const sedeDeRespaldo = fx.fixture.venue.name
    ? null
    : await getTeamVenue(home.id).catch(() => null);
  const datosEstructurados = matchJsonLd(fx, competition, played, sedeDeRespaldo);

  return (
    <main className="page">
      {datosEstructurados && <JsonLd data={datosEstructurados} />}
      {liveNow && <LiveRefresh />}
      <section className="phero" style={{ paddingBottom: 20 }}>
        <div className="wrap">
          <Link
            href={played ? `${base}?v=finalizados` : `${base}?v=partidos`}
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← {played ? "Resultados" : "Próximos partidos"}
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
                <TeamHead competition={competition} team={home} winner={home.winner} />
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
                <TeamHead competition={competition} team={away} winner={away.winner} />
                <EvList lines={awayLines} align="right" />
              </div>
            </div>

            {!played && (
              <div style={{ marginTop: 18 }}>
                <p
                  className="mono"
                  style={{
                    textAlign: "center",
                    color: "var(--text-dim)",
                    fontSize: "0.6rem",
                    marginBottom: 8,
                  }}
                >
                  Empieza en
                </p>
                <Countdown kickoff={fx.fixture.date} />
              </div>
            )}

            <p
              className="match__when"
              style={{
                textAlign: "center",
                marginTop: hasLines || !played ? 18 : 16,
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

      {standingsRows.length > 0 && (
        <section className="section" style={{ paddingTop: 4, paddingBottom: 0 }}>
          <div className="wrap">
            <StandingsImpact
              rows={standingsRows}
              home={{ id: home.id, name: home.name }}
              away={{ id: away.id, name: away.name }}
            />
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 4, paddingBottom: 0 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <MatchAnalisis fixtureId={fixtureId} />
          </Suspense>
          <Suspense fallback={null}>
            <MatchQuiniela
              fixtureId={fixtureId}
              played={played}
              goles={{ home: fx.goals.home, away: fx.goals.away }}
            />
          </Suspense>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <MatchTabs
            fixtureId={fixtureId}
            competitionSlug={competition.slug}
            home={{ id: home.id, name: home.name, logo: home.logo }}
            away={{ id: away.id, name: away.name, logo: away.logo }}
            initialTab={played ? "stats" : "preview"}
          >
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

          {(hasRatings || hasLineups) && (
            <div style={{ marginTop: 28 }}>
              <PlayerRatings
                home={{ id: home.id, name: home.name, logo: home.logo }}
                away={{ id: away.id, name: away.name, logo: away.logo }}
                homePlayers={homePlayers}
                awayPlayers={awayPlayers}
                homeLineup={homeLineup}
                awayLineup={awayLineup}
                inKeys={subs.inKeys}
                outKeys={subs.outKeys}
              />
            </div>
          )}

          {(homeLineup?.substitutes.length ?? 0) +
            (awayLineup?.substitutes.length ?? 0) >
            0 && (
            <div style={{ marginTop: 28 }}>
              <div className="shead">
                <h2>Suplentes</h2>
                <span className="sh-note">banquillo completo</span>
              </div>
              <div className="panel" style={{ padding: "18px 20px" }}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <TeamBench
                    team={home}
                    subs={homeLineup?.substitutes ?? []}
                    inKeys={cameInKeys}
                  />
                  <TeamBench
                    team={away}
                    subs={awayLineup?.substitutes ?? []}
                    inKeys={cameInKeys}
                  />
                </div>
              </div>
            </div>
          )}
          </MatchTabs>
        </div>
      </section>
    </main>
  );
}

function TeamBench({
  team,
  subs,
  inKeys,
}: {
  team: { id: number; name: string; logo: string };
  subs: { id: number; number: number | null; name: string; pos: string | null }[];
  inKeys: Set<string>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <Image src={team.logo} alt="" width={22} height={22} unoptimized />
        <b className="truncate" style={{ fontSize: "0.9rem" }}>
          {team.name}
        </b>
      </div>
      {subs.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {subs.map((p) => {
            const cameIn = inKeys.has(subKey(p.name));
            return (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "baseline",
                  padding: "4px 0",
                  fontSize: "0.84rem",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span
                  className="mono tabular-nums"
                  style={{ color: "var(--text-dim)", width: 20, textAlign: "right" }}
                >
                  {p.number ?? "–"}
                </span>
                <span className="truncate">{p.name}</span>
                {cameIn && (
                  <span
                    title="Entró en el partido"
                    style={{ color: "#4ade80", fontSize: "0.8rem" }}
                  >
                    ▲
                  </span>
                )}
                {p.pos && (
                  <span
                    className="mono"
                    style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "0.68rem" }}
                  >
                    {p.pos}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hint" style={{ margin: 0 }}>
          Sin datos de banquillo.
        </p>
      )}
    </div>
  );
}

function TeamHead({
  competition,
  team,
  winner,
}: {
  competition: Competition;
  team: { id: number; name: string; logo: string };
  winner: boolean | null;
}) {
  return (
    <Link
      href={`/liga/${competition.slug}/equipo/${team.id}`}
      title={`Ver el historial de ${team.name}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: winner === false ? 0.6 : 1,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <Image src={team.logo} alt="" width={48} height={48} unoptimized />
      <span style={{ fontWeight: 700, textAlign: "center", fontSize: "0.95rem" }}>
        {team.name}
      </span>
    </Link>
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
            opacity: e.muted ? 0.6 : 1,
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

const AWAY_COLOR = "#ff5b8a";

function StatPill({
  value,
  lead,
  side,
}: {
  value: string;
  lead: boolean;
  side: "home" | "away";
}) {
  const color = side === "home" ? "var(--accent)" : AWAY_COLOR;
  return (
    <span
      className="tabular-nums"
      style={{
        minWidth: 52,
        textAlign: "center",
        padding: "6px 12px",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: "0.95rem",
        background: lead ? color : "var(--surface-2)",
        color: lead ? "#0a1030" : "var(--text-dim)",
        border: lead ? "none" : "1px solid var(--line)",
      }}
    >
      {value}
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

  // Posesión (y cualquier %): barra grande partida con el valor a cada lado.
  if (row.pct) {
    const total = h + a;
    const hPct = total > 0 ? (h / total) * 100 : 50;
    return (
      <div style={{ padding: "12px 0" }}>
        <p
          className="mono"
          style={{
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: "0.66rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          {row.label}
        </p>
        <div
          className="tabular-nums"
          style={{
            display: "flex",
            height: 30,
            borderRadius: 8,
            overflow: "hidden",
            fontWeight: 800,
            fontSize: "0.9rem",
            color: "#0a1030",
          }}
        >
          <div
            style={{
              width: `${hPct}%`,
              minWidth: 44,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
            }}
          >
            {String(hRaw)}
          </div>
          <div
            style={{
              width: `${100 - hPct}%`,
              minWidth: 44,
              background: AWAY_COLOR,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 12,
            }}
          >
            {String(aRaw)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
      }}
    >
      <StatPill value={String(hRaw)} lead={h >= a} side="home" />
      <span
        className="mono"
        style={{
          flex: 1,
          textAlign: "center",
          color: "var(--text-dim)",
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {row.label}
      </span>
      <StatPill value={String(aRaw)} lead={a >= h} side="away" />
    </div>
  );
}
