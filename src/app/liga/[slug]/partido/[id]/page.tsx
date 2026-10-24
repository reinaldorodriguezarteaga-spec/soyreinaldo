import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cuotaAgotada,
  directoTtl,
  getFixtureById,
  partidoDelCalendario,
  getFixtureCards,
  getFixtureGoals,
  getFixtureLineups,
  getFixtureNotes,
  getFixturePlayers,
  getFixtureStatistics,
  getFixtureSubEvents,
  getFixtureSubs,
  isFinal,
  isLive,
  reconcileGoals,
  getCompetitionStandings,
  type Fixture,
  type FixtureGoal,
  type StandingRow,
  getTeamSquad,
  getTeamVenue,
  mismoEstadio,
  type TeamVenue,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import { filasDirecto } from "@/lib/sports/directo";
import JsonLd, { absolute } from "@/lib/seo/json-ld";
import StandingsImpact from "./standings-impact";
import MatchQuiniela from "./match-quiniela";
import MatchVideos from "./match-videos";
import MatchEncuestas from "./match-encuestas";
import MatchNotasAficion from "./match-notas-aficion";
import MatchSiguienteGol from "./match-siguiente-gol";
import { golesDe } from "@/lib/partido/siguiente-gol";
import BotonCompartir from "@/components/BotonCompartir";
import CompartirImagen from "@/components/CompartirImagen";
import MatchAnalisis from "./match-analisis";
import MatchPrevia from "./match-previa";
import MatchCronica from "./match-cronica";
import type { DatosCronica } from "@/lib/partido/cronica";
import { conTildes } from "@/lib/sports/nombres";
import PlayerRatings from "./player-ratings";
import LiveRefresh from "./live-refresh";
import Countdown from "./countdown";
import MatchTabs from "./match-tabs";
import MatchFicha from "./match-ficha";
import { roundMeta } from "@/lib/sports/rounds";
import Cronologia, { nombreConocido, type Ev } from "./cronologia";

/** Etiqueta ES de una ronda: la misma traducción que el calendario
 * (`roundMeta`: "Regular Season/League Stage/League Phase - N" → "Jornada N",
 * octavos, cuartos…). Antes solo traducía la liga regular y la ficha de la
 * Champions decía "League Stage - 2". */
function roundLabelEs(round: string | null, competitionName: string): string {
  if (!round) return competitionName;
  return roundMeta(round).label;
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
  const fx =
    (await getFixtureById(fixtureId, 60).catch(() => null)) ??
    (await partidoDelCalendario(competition, fixtureId));
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

  // Google exige `location` CON `address`: un estadio a secas no le vale (la
  // validación del 24-ago falló justo por eso, con partidos que traían nombre
  // de campo pero no ciudad). Se compone la sede más completa posible:
  //  - el nombre que dé el partido, si lo da;
  //  - y la dirección de la ficha del equipo local, siempre que sea SU campo
  //    (comparación laxa: "Stade Pierre-Mauroy" y "Decathlon Arena - Stade
  //    Pierre-Mauroy" son el mismo). En sede neutral no se mezcla: sería
  //    inventarse una dirección.
  const nombreDelPartido = fx.fixture.venue.name ?? null;
  const esSuCampo =
    !nombreDelPartido ||
    mismoEstadio(nombreDelPartido, sedeDeRespaldo?.name ?? null);

  const sede = {
    name: nombreDelPartido ?? sedeDeRespaldo?.name ?? null,
    street: esSuCampo ? (sedeDeRespaldo?.street ?? null) : null,
    city:
      fx.fixture.venue.city ?? (esSuCampo ? (sedeDeRespaldo?.city ?? null) : null),
    country: esSuCampo ? (sedeDeRespaldo?.country ?? null) : null,
  };

  // Sin nombre o sin ciudad no hay `address` que valga, y unos datos
  // estructurados incompletos son peores que ninguno: Google los rechaza
  // entero y encima lo apunta como error.
  if (!sede.name || !sede.city) return null;

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
      address: {
        "@type": "PostalAddress",
        ...(sede.street ? { streetAddress: sede.street } : {}),
        addressLocality: sede.city,
        ...(sede.country ? { addressCountry: sede.country } : {}),
      },
    },
    homeTeam: equipo(home),
    awayTeam: equipo(away),
    competitor: [equipo(home), equipo(away)],
    // Quien "actúa" en un partido son los dos equipos.
    performer: [equipo(home), equipo(away)],
    // `url` es la web del organizador de verdad (laliga.com, uefa.com…), no
    // una página nuestra: Search Console la pedía y poner la nuestra sería
    // afirmar que LaLiga vive en soyreinaldo.com.
    organizer: {
      "@type": "SportsOrganization",
      name: competition.name,
      ...(competition.officialUrl ? { url: competition.officialUrl } : {}),
    },
    superEvent: {
      "@type": "SportsOrganization",
      name: competition.name,
      ...(competition.officialUrl ? { url: competition.officialUrl } : {}),
    },
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

  // Primero el partido para saber si está en juego; si lo está, el resto se
  // pide con caché corta y la página se recarga sola cada 20 s.
  // 13-oct: 20 s si el partido está en juego o cerca (directoTtl), 120 s si
  // no (antes 45 s siempre, con recarga cada 60 s: un gol tardaba ~2 min).
  // Si la API no lo da (rate limit, corte), del calendario guardado: un
  // partido que está en el calendario existe, y un 404 en pleno directo
  // (13-oct) es lo peor que se le puede enseñar a quien entra a verlo.
  //
  // El directo (Supabase) se pide YA, a la vez que el calendario de
  // directoTtl: getFixtureById reutiliza esa misma consulta en curso en vez
  // de lanzarla después (una espera menos en serie).
  void filasDirecto();
  const fx =
    (await getFixtureById(fixtureId, await directoTtl(competition, fixtureId, 120))) ??
    (await partidoDelCalendario(competition, fixtureId));
  if (!fx) {
    if (cuotaAgotada()) throw new Error("API-Football sin cuota: ficha no disponible ahora");
    notFound();
  }
  const liveNow = isLive(fx);
  // En juego: lo que cambia a cada momento (eventos: goles, tarjetas,
  // cambios, notas — UNA llamada compartida) a 20 s; lo que cambia despacio,
  // más largo. undefined = caché por defecto del fetcher.
  const rvEventos = liveNow ? 20 : undefined;
  const rvStats = liveNow ? 60 : undefined;
  const rvJugadores = liveNow ? 90 : undefined;
  const rvAlineaciones = liveNow ? 120 : undefined;

  // Todo lo que depende solo del partido va en UNA tanda: la clasificación y
  // la sede iban después, cada una con su propia espera (13-oct, fichas
  // lentas).
  const sinJugar = !isLive(fx) && !isFinal(fx);
  const [
    rawGoals,
    cards,
    stats,
    players,
    lineups,
    notes,
    subs,
    subEvents,
    standings,
    sedeDeRespaldo,
    plantillaHome,
    plantillaAway,
  ] = await Promise.all([
    getFixtureGoals(fixtureId, rvEventos),
    getFixtureCards(fixtureId, rvEventos),
    getFixtureStatistics(fixtureId, rvStats),
    getFixturePlayers(fixtureId, rvJugadores),
    getFixtureLineups(fixtureId, rvAlineaciones),
    getFixtureNotes(fixtureId, rvEventos),
    getFixtureSubs(fixtureId, rvEventos),
    getFixtureSubEvents(fixtureId, rvEventos),
    // Clasificación: antes de jugarse (tabla proyectada + puesto de cada
    // equipo) y en directo (el puesto con el que empezó: la tabla aún no
    // cuenta este partido). Terminado ya no: sería la de después. Sale de
    // `sports_cache`, no gasta cuota.
    !isFinal(fx) && competition.standingsMode === "table"
      ? getCompetitionStandings(competition).catch(() => null)
      : null,
    // La ficha del equipo local da la dirección del campo. Se consulta
    // siempre —no solo cuando falta el nombre— porque el partido a veces
    // trae estadio pero no ciudad, y sin ciudad Google descarta el evento.
    // Cacheada 30 días.
    getTeamVenue(fx.teams.home.id).catch(() => null),
    // Plantillas: el nombre por el que se conoce a cada jugador ("Endrick",
    // "K. Mbappé", "Dani Olmo") para la cronología. Las precalcula el cron
    // en `sports_cache`: sin cuota.
    getTeamSquad(fx.teams.home.id).catch(() => []),
    getTeamSquad(fx.teams.away.id).catch(() => []),
  ]);
  const nombrePlantilla = new Map<number, string>(
    [...plantillaHome, ...plantillaAway].map((p) => [p.id, p.name]),
  );

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

  // Goles y expulsiones bajo cada equipo. El autogol va bajo el equipo al
  // que sube al marcador: el API ya lo trae así en `teamId` (24-oct: se
  // invertía y salía bajo el equipo equivocado).
  const benefTeam = (g: FixtureGoal) => g.teamId;
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
        playerId: g.playerId ?? null,
      }));
    const rs: Ev[] = cards
      .filter((c) => c.expulsion && c.teamId === teamId)
      .map((c) => ({
        icon: "🟥",
        minute: c.minute,
        player: c.player,
        tag: /second/i.test(c.detail) ? "(2ª am.)" : "",
        assist: null,
        playerId: c.playerId ?? null,
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
        playerId: n.playerId ?? null,
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
  const filasTabla = Array.isArray(standings)
    ? (standings as StandingRow[]).filter(
        (r): r is StandingRow => "rank" in r && "points" in r,
      )
    : [];
  // La tabla proyectada, como siempre, solo antes de jugarse.
  const standingsRows = sinJugar ? filasTabla : [];
  const puestoHome = puestoEnTabla(filasTabla, home.id);
  const puestoAway = puestoEnTabla(filasTabla, away.id);

  // Crónica automática (solo terminados): todo de lo ya cargado, sin llamar.
  const par = (type: string): [number, number] | null => {
    const h = val(homeStats, type);
    const a = val(awayStats, type);
    return h == null || a == null ? null : [toNum(h), toNum(a)];
  };
  const mejor = [...homePlayers.map((p) => ({ p, equipoId: home.id })), ...awayPlayers.map((p) => ({ p, equipoId: away.id }))]
    .filter((x) => x.p.rating != null && (x.p.minutes ?? 0) > 0)
    .sort((a, b) => (b.p.rating ?? 0) - (a.p.rating ?? 0))[0];
  const cronica: DatosCronica | null = final
    ? {
        competicion: competition.name,
        ronda: fx.league.round ? roundLabelEs(fx.league.round, competition.name) : null,
        local: { id: home.id, nombre: conTildes(home.name) },
        visitante: { id: away.id, nombre: conTildes(away.name) },
        golesLocal: fx.goals.home ?? 0,
        golesVisitante: fx.goals.away ?? 0,
        // El API ya pone el autogol en el equipo beneficiado.
        goles: goals.map((g) => ({
          minuto: g.minute,
          equipoId: g.teamId,
          jugador: nombreConocido(g.player, g.playerId, nombrePlantilla),
          tipo: g.detail,
        })),
        expulsiones: cards
          .filter((c) => c.expulsion)
          .map((c) => ({
            minuto: c.minute,
            equipoId: c.teamId,
            jugador: nombreConocido(c.player, c.playerId, nombrePlantilla),
          })),
        posesion: par("Ball Possession"),
        tiros: par("Total Shots"),
        tirosPuerta: par("Shots on Goal"),
        xg: par("expected_goals"),
        mejor: mejor
          ? {
              nombre: nombreConocido(mejor.p.name, mejor.p.id, nombrePlantilla),
              equipoId: mejor.equipoId,
              nota: mejor.p.rating!,
            }
          : null,
      }
    : null;

  // Encuesta "¿Quién fue el mejor?": los 5 mejor valorados, al terminar.
  // Solo partidos de la última semana: los buscadores recorren cientos de
  // fichas viejas y cada visita crearía una encuesta que nadie va a ver.
  const recienTerminado = final && empezoHaceMenosDe(fx.fixture.date, 7);
  const candidatosMvp = recienTerminado
    ? [...homePlayers, ...awayPlayers]
        .filter((p) => p.rating != null && (p.minutes ?? 0) > 0)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 5)
        .map((p) => ({ id: String(p.id), texto: nombreConocido(p.name, p.id, nombrePlantilla) }))
    : null;

  // Nota de la afición: los que jugaron de cada equipo, por minutos. Se vota
  // la semana siguiente al partido (como la encuesta del MVP).
  const equiposNotas = final
    ? [
        { t: home, ps: homePlayers },
        { t: away, ps: awayPlayers },
      ].map(({ t, ps }) => ({
        id: t.id,
        nombre: t.name,
        escudo: t.logo,
        jugadores: ps
          .filter((p) => (p.minutes ?? 0) > 0)
          .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
          .map((p) => ({ id: p.id, nombre: nombreConocido(p.name, p.id, nombrePlantilla), foto: p.photo, nota: p.rating })),
      }))
    : null;

  const homeLineup = lineups.find((l) => l.teamId === home.id) ?? null;
  const awayLineup = lineups.find((l) => l.teamId === away.id) ?? null;
  const hasRatings = homePlayers.length > 0 || awayPlayers.length > 0;
  // Los onces se publican ~1h antes del pitido; las valoraciones, con el
  // partido ya andando. Entre lo uno y lo otro, lo que la gente busca es la
  // alineación — se pinta el mismo campo, sin notas.
  const hasLineups = !!(homeLineup?.startXI.length && awayLineup?.startXI.length);

  const base = `/liga/${competition.slug}`;

  const datosEstructurados = matchJsonLd(fx, competition, played, sedeDeRespaldo);

  return (
    <main className="page">
      {datosEstructurados && <JsonLd data={datosEstructurados} />}
      {liveNow && <LiveRefresh intervalMs={20_000} fixtureId={fixtureId} />}
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
            <div className="match__meta" style={{ marginBottom: 14, justifyContent: "center" }}>
              <span className="match__grp">{roundLabelEs(fx.league.round, competition.name)}</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "start",
                gap: 12,
              }}
            >
              <TeamHead competition={competition} team={home} winner={home.winner} puesto={puestoHome} />
              <div style={{ textAlign: "center", paddingTop: 10 }}>
                <div className="display" style={{ fontSize: "2.8rem", whiteSpace: "nowrap", lineHeight: 1 }}>
                  {played ? (
                    <>
                      {fx.goals.home ?? 0}
                      <span style={{ color: "var(--text-dim)", margin: "0 10px" }}>–</span>
                      {fx.goals.away ?? 0}
                    </>
                  ) : (
                    <span style={{ color: "var(--text-dim)", fontSize: "1.4rem" }}>VS</span>
                  )}
                </div>
                <p style={{ marginTop: 12, fontSize: "0.85rem", color: live ? "var(--danger, #ff5a6a)" : "var(--text-dim)" }}>
                  {live ? (
                    <>
                      <span className="livepulse" />{" "}
                      {fx.fixture.status.elapsed != null ? `${fx.fixture.status.elapsed}'` : "En vivo"}
                    </>
                  ) : final ? (
                    "Finalizado"
                  ) : (
                    "Por jugarse"
                  )}
                </p>
              </div>
              <TeamHead competition={competition} team={away} winner={away.winner} puesto={puestoAway} />
            </div>

            <Cronologia home={homeLines} away={awayLines} nombres={nombrePlantilla} />

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
            {/* Compartir el partido (17-oct, pedido del dueño) y abrirlo en la
                pizarra con sus alineaciones (20-oct). */}
            <p style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, margin: "12px 0 0" }}>
              <Link href={`/pizarra?partido=${fixtureId}`} className="compartir__btn" prefetch={false}>
                <span aria-hidden>🧩</span> Abrir en la pizarra
              </Link>
              {played && (
                <CompartirImagen
                  soloBoton
                  imagen={`/liga/${slug}/partido/${fixtureId}/imagen`}
                  nombreArchivo={`${home.name}-${away.name}.png`.replace(/\s+/g, "-")}
                  url={`https://www.soyreinaldo.com/liga/${slug}/partido/${fixtureId}`}
                  texto={`${conTildes(home.name)} ${fx.goals.home ?? 0}–${fx.goals.away ?? 0} ${conTildes(away.name)} · ${competition.name}`}
                />
              )}
              <BotonCompartir
                url={`https://www.soyreinaldo.com/liga/${slug}/partido/${fixtureId}`}
                texto={
                  played
                    ? `${conTildes(home.name)} ${fx.goals.home ?? 0}–${fx.goals.away ?? 0} ${conTildes(away.name)} · ${competition.name}`
                    : `${conTildes(home.name)} – ${conTildes(away.name)} · ${competition.name}, en directo en soyreinaldo.com`
                }
              />
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
          {cronica && <MatchCronica datos={cronica} />}
          <Suspense fallback={null}>
            <MatchVideos local={home.name} visitante={away.name} inicio={fx.fixture.date} />
          </Suspense>
          {played && (
            <Suspense fallback={null}>
              <MatchSiguienteGol
                fixtureId={fixtureId}
                local={home.name}
                visitante={away.name}
                estado={fx.fixture.status.short}
                transcurrido={fx.fixture.status.elapsed}
                enJuego={live}
                terminado={final}
                goles={golesDe(goals, home.id)}
              />
            </Suspense>
          )}
          <Suspense fallback={null}>
            <MatchEncuestas fixtureId={fixtureId} candidatosMvp={candidatosMvp} />
          </Suspense>
          {equiposNotas && equiposNotas.some((e) => e.jugadores.length > 0) && (
            <Suspense fallback={null}>
              <MatchNotasAficion fixtureId={fixtureId} equipos={equiposNotas} abierto={empezoHaceMenosDe(fx.fixture.date, 7)} />
            </Suspense>
          )}
          {!played && (
            <Suspense fallback={null}>
              <MatchPrevia
                fixtureId={fixtureId}
                home={{ id: home.id, name: home.name }}
                away={{ id: away.id, name: away.name }}
                standings={standingsRows}
              />
            </Suspense>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20, paddingBottom: 0 }}>
        <div className="wrap">
          <MatchTabs
            fixtureId={fixtureId}
            competitionSlug={competition.slug}
            home={{ id: home.id, name: home.name, logo: home.logo }}
            away={{ id: away.id, name: away.name, logo: away.logo }}
            initialTab={played ? "stats" : "preview"}
            ficha={
              played && hasLineups ? (
                <MatchFicha
                  fx={fx}
                  roundLabel={roundLabelEs(fx.league.round, competition.name)}
                  home={{ id: home.id, name: home.name, logo: home.logo }}
                  away={{ id: away.id, name: away.name, logo: away.logo }}
                  homeLineup={homeLineup}
                  awayLineup={awayLineup}
                  homePlayers={homePlayers}
                  awayPlayers={awayPlayers}
                  rows={rows}
                  homeLines={homeLines}
                  awayLines={awayLines}
                  nombres={nombrePlantilla}
                  subs={subEvents}
                  statusLabel={
                    live
                      ? fx.fixture.status.elapsed != null
                        ? `${fx.fixture.status.elapsed}'`
                        : "En vivo"
                      : "Final"
                  }
                />
              ) : undefined
            }
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
                minutos={subs.minutos}
              />
            </div>
          )}

          </MatchTabs>
        </div>
      </section>

      {/* Al final a propósito: la quiniela es solo para quien juega, y antes
          empujaba las estadísticas —lo que busca todo el mundo— hacia abajo. */}
      <section className="section" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <Suspense fallback={null}>
            <MatchQuiniela
              fixtureId={fixtureId}
              played={played}
              goles={{ home: fx.goals.home, away: fx.goals.away }}
              equipos={{ local: fx.teams.home.name, visitante: fx.teams.away.name }}
            />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

/** Puesto de un equipo en la tabla ("3.º · 19 pts"), o null si no está.
 * En las ligas con varias tablas (conferencias, grupos) el puesto es el de
 * la suya; en la argentina (Apertura y Clausura) manda la del Clausura. */
function puestoEnTabla(filas: StandingRow[], teamId: number): string | null {
  const suyas = filas.filter((r) => r.team.id === teamId);
  const fila = suyas.find((r) => /clausura/i.test(r.group ?? "")) ?? suyas[0];
  if (!fila) return null;
  return `${fila.rank}.º · ${fila.points} pts`;
}

function TeamHead({
  competition,
  team,
  winner,
  puesto,
}: {
  competition: Competition;
  team: { id: number; name: string; logo: string };
  winner: boolean | null;
  /** Puesto en la tabla antes del partido (null = no se enseña). */
  puesto?: string | null;
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
      <Image
        src={team.logo}
        alt=""
        width={60}
        height={60}
        unoptimized
        style={{ width: 60, height: 60, objectFit: "contain" }}
      />
      <span style={{ fontWeight: 700, textAlign: "center", fontSize: "0.95rem" }}>
        {team.name}
      </span>
      {puesto && (
        <span
          className="mono"
          style={{ color: "var(--text-dim)", fontSize: "0.7rem", marginTop: -4 }}
        >
          {puesto}
        </span>
      )}
    </Link>
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

/** ¿Empezó hace menos de `dias` días? (fuera del componente: la hora no es pura). */
function empezoHaceMenosDe(iso: string, dias: number): boolean {
  return Date.now() - new Date(iso).getTime() < dias * 86_400_000;
}
