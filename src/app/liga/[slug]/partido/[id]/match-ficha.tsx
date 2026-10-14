import Image from "next/image";
import Cronologia, { type Ev } from "./cronologia";
import {
  subKey,
  type Fixture,
  type FixtureSubEvent,
  type LineupPlayer,
  type LineupTeam,
  type PlayerRating,
} from "@/lib/sports/api-football";
import FichaFullscreen from "./ficha-fullscreen";

/**
 * Ficha visual del partido: la misma tarjeta que el marcador completo del
 * Multichat (chat.soyreinaldo.com/marcador/completo) pero con el tema de la
 * web, pensada para capturarla y comentarla en los vídeos de análisis.
 * Marcador arriba, campo vertical con el ONCE INICIAL a la izquierda (foto,
 * dorsal, nota, goles, tarjetas y, si salió, en qué minuto) y las
 * estadísticas con barras a la derecha, estiradas a la misma altura que el
 * campo. Debajo, los que entraron: minuto, por quién, nota, goles y
 * asistencias (13-oct: el dueño quiere ver cómo empezó el partido, no cómo
 * acabó, y a los cambios aparte).
 */

type Team = { id: number; name: string; logo: string };

export type FichaStatRow = {
  label: string;
  pct?: boolean;
  home: number | string | null;
  away: number | string | null;
};


/** Jugador ya cruzado con su valoración y sus cambios. */
type Chip = {
  key: string;
  name: string;
  number: number | null;
  grid: string | null;
  photo: string | null;
  rating: number | null;
  goals: number;
  yellow: number;
  red: number;
  /** minuto en que salió (sustituido), o null si jugó hasta el final */
  subbedOut: number | null;
};

/** Un jugador que entró desde el banquillo. */
type Entrada = {
  key: string;
  minute: number | null;
  name: string;
  number: number | null;
  photo: string | null;
  porQuien: string | null;
  rating: number | null;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
};

export default function MatchFicha({
  fx,
  roundLabel,
  home,
  away,
  homeLineup,
  awayLineup,
  homePlayers,
  awayPlayers,
  rows,
  homeLines,
  awayLines,
  nombres,
  subs,
  statusLabel,
}: {
  fx: Fixture;
  roundLabel: string;
  home: Team;
  away: Team;
  homeLineup: LineupTeam | null;
  awayLineup: LineupTeam | null;
  homePlayers: PlayerRating[];
  awayPlayers: PlayerRating[];
  rows: FichaStatRow[];
  /** Goles, expulsiones y penaltis fallados (la misma cronología que la ficha). */
  homeLines: Ev[];
  awayLines: Ev[];
  nombres: Map<number, string>;
  subs: FixtureSubEvent[];
  statusLabel: string;
}) {
  const homeSubs = subs.filter((s) => s.teamId === home.id);
  const awaySubs = subs.filter((s) => s.teamId === away.id);
  const homeChips = onceInicial(homeLineup, homePlayers, homeSubs);
  const awayChips = onceInicial(awayLineup, awayPlayers, awaySubs);
  const homeEntradas = entradas(homeLineup, homePlayers, homeSubs);
  const awayEntradas = entradas(awayLineup, awayPlayers, awaySubs);

  return (
    <FichaFullscreen>
      <article className="ficha" aria-label={`Ficha ${home.name} - ${away.name}`}>
        <header className="ficha__head">
          <div className="ficha__meta">
            <span className="mono">{fx.league.name}</span>
            <span className="ficha__status">{statusLabel}</span>
            <span className="mono">{roundLabel}</span>
          </div>
          <div className="ficha__teams">
            <div className="ficha__team">
              <Image src={home.logo} alt="" width={52} height={52} unoptimized className="ficha__logo" />
              <div className="ficha__teamtxt">
                <span className="ficha__name">{home.name}</span>
                {homeLineup?.formation && <span className="ficha__formation">{homeLineup.formation}</span>}
              </div>
            </div>
            <div className="ficha__score">
              <span>{fx.goals.home ?? 0}</span>
              <span className="ficha__dash">–</span>
              <span>{fx.goals.away ?? 0}</span>
            </div>
            <div className="ficha__team ficha__team--away">
              <Image src={away.logo} alt="" width={52} height={52} unoptimized className="ficha__logo" />
              <div className="ficha__teamtxt">
                <span className="ficha__name">{away.name}</span>
                {awayLineup?.formation && <span className="ficha__formation">{awayLineup.formation}</span>}
              </div>
            </div>
          </div>
          <Cronologia home={homeLines} away={awayLines} nombres={nombres} compacta />
        </header>

        <div className="ficha__body">
          <section className="ficha__pitchcol">
            {homeChips.length > 0 && awayChips.length > 0 ? (
              <div className="ficha__pitch">
                <div className="ficha__lines" aria-hidden>
                  <div className="ficha__box ficha__box--top" />
                  <div className="ficha__box ficha__box--bottom" />
                  <div className="ficha__circle" />
                  <div className="ficha__midline" />
                </div>
                {place(homeChips, "arriba").map(({ p, x, y }) => (
                  <PlayerChip key={p.key} p={p} x={x} y={y} />
                ))}
                {place(awayChips, "abajo").map(({ p, x, y }) => (
                  <PlayerChip key={p.key} p={p} x={x} y={y} />
                ))}
              </div>
            ) : (
              <div className="ficha__pitch ficha__pitch--empty">Alineaciones no disponibles</div>
            )}
          </section>

          <section className="ficha__statscol">
            <h3 className="ficha__h">Estadísticas</h3>
            {rows.length === 0 ? (
              <p className="ficha__empty">Sin estadísticas todavía.</p>
            ) : (
              <div className="ficha__stats">
                {rows.map((r) => {
                  const h = num(r.home);
                  const a = num(r.away);
                  const tot = h + a;
                  const hp = tot > 0 ? (h / tot) * 100 : 50;
                  const show = (v: number | string | null) =>
                    v == null ? "–" : r.pct ? `${num(v)}%` : String(v);
                  return (
                    <div className="ficha__stat" key={r.label}>
                      <div className="ficha__statvals">
                        <span data-lead={h > a}>{show(r.home)}</span>
                        <span className="ficha__statlabel">{r.label}</span>
                        <span data-lead={a > h}>{show(r.away)}</span>
                      </div>
                      <div className="ficha__bar">
                        <span style={{ width: `${hp}%` }} />
                        <span style={{ width: `${100 - hp}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </section>
        </div>
        {(homeEntradas.length > 0 || awayEntradas.length > 0) && (
          <section className="ficha__bench" aria-label="Cambios">
            <h3 className="ficha__h">Cambios</h3>
            <div className="ficha__benchcols">
              <ListaEntradas lista={homeEntradas} lado="home" />
              <ListaEntradas lista={awayEntradas} lado="away" />
            </div>
          </section>
        )}
        <footer className="ficha__foot">
          <span className="mono">soyreinaldo.com</span>
          <span className="mono">@SoyReinaldoR</span>
        </footer>
      </article>
    </FichaFullscreen>
  );
}

/** Cruza cada jugador de la alineación con su valoración del partido. Por
 * id y, si el API no lo trae, por apellido (`subKey`) — solo por apellido
 * fallaba con dos "García" en el mismo equipo. */
function buscador(players: PlayerRating[]) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const byKey = new Map(players.map((p) => [subKey(p.name), p]));
  return (id: number | null, name: string | null): PlayerRating | undefined =>
    (id != null ? byId.get(id) : undefined) ?? (name ? byKey.get(subKey(name)) : undefined);
}

/** ¿Este cambio es la salida de este jugador? Por id o, sin id, por apellido. */
function sale(s: FixtureSubEvent, lp: LineupPlayer): boolean {
  if (s.outId != null) return s.outId === lp.id;
  return !!s.outName && subKey(s.outName) === subKey(lp.name);
}

/** El once inicial tal cual empezó, con el minuto en que salió cada uno. */
function onceInicial(
  lineup: LineupTeam | null,
  players: PlayerRating[],
  subs: FixtureSubEvent[],
): Chip[] {
  if (!lineup || lineup.startXI.length === 0) return [];
  const rating = buscador(players);
  return lineup.startXI.map((lp) => {
    const pr = rating(lp.id, lp.name);
    return {
      key: `${lp.id}-${lp.name}`,
      name: lp.name,
      number: lp.number ?? pr?.number ?? null,
      grid: lp.grid,
      photo: pr?.photo ?? null,
      rating: pr?.rating ?? null,
      goals: pr?.goals ?? 0,
      yellow: pr?.stats.yellow ?? 0,
      red: pr?.stats.red ?? 0,
      subbedOut: subs.find((s) => sale(s, lp))?.minute ?? null,
    };
  });
}

/** Los que entraron desde el banquillo, en orden, con lo que hicieron. */
function entradas(
  lineup: LineupTeam | null,
  players: PlayerRating[],
  subs: FixtureSubEvent[],
): Entrada[] {
  const rating = buscador(players);
  const banquillo = buscador(
    (lineup?.substitutes ?? []).map((p) => ({ id: p.id, name: p.name, number: p.number }) as PlayerRating),
  );
  return subs
    .filter((s) => s.inName || s.inId != null)
    .map((s, i) => {
      const pr = rating(s.inId, s.inName);
      const bench = banquillo(s.inId, s.inName);
      return {
        key: `${s.inId ?? s.inName}-${i}`,
        minute: s.minute,
        name: pr?.name ?? bench?.name ?? s.inName ?? "—",
        number: pr?.number ?? bench?.number ?? null,
        photo: pr?.photo ?? null,
        // Nombre corto de la alineación por id: el del evento es el completo
        // ("Pablo Martín Páez Gavira" en vez de "Gavi", 13-oct).
        porQuien:
          [...(lineup?.startXI ?? []), ...(lineup?.substitutes ?? [])].find(
            (lp) => s.outId != null && lp.id === s.outId,
          )?.name ?? s.outName,
        rating: pr?.rating ?? null,
        goals: pr?.goals ?? 0,
        assists: pr?.assists ?? 0,
        yellow: pr?.stats.yellow ?? 0,
        red: pr?.stats.red ?? 0,
      };
    });
}

/**
 * Posiciones (%) desde la rejilla "fila:columna" (fila 1 = portero).
 *
 * La columna del API va de izquierda a derecha DESDE EL PUNTO DE VISTA DEL
 * EQUIPO (columna 1 = su banda izquierda: el lateral izquierdo, el extremo
 * izquierdo). El equipo de arriba ataca hacia abajo, así que su izquierda
 * es la DERECHA de la pantalla: a él hay que darle la vuelta en horizontal.
 * Antes se le daba al de abajo, y en todos los partidos salían los dos
 * equipos con las bandas cambiadas (Koundé y Lamine en la izquierda, 13-oct).
 */
function place(chips: Chip[], lado: "arriba" | "abajo") {
  const rows = new Map<number, Chip[]>();
  for (const c of chips) {
    const r = Number((c.grid ?? "1:1").split(":")[0]);
    const row = Number.isFinite(r) && r > 0 ? r : 1;
    rows.set(row, [...(rows.get(row) ?? []), c]);
  }
  const nRows = Math.max(...rows.keys(), 1);
  const col = (c: Chip) => Number((c.grid ?? "1:1").split(":")[1]) || 0;
  const out: { p: Chip; x: number; y: number }[] = [];
  for (const [row, ps] of rows) {
    const sorted = ps.slice().sort((a, b) => col(a) - col(b));
    sorted.forEach((p, i) => {
      const yHalf = 8 + ((row - 1) / Math.max(nRows - 1, 1)) * 36; // 8%..44% de cada mitad
      const x = ((i + 0.5) / sorted.length) * 100;
      out.push(
        lado === "arriba" ? { p, x: 100 - x, y: yHalf } : { p, x, y: 100 - yHalf },
      );
    });
  }
  return out;
}

function ListaEntradas({ lista, lado }: { lista: Entrada[]; lado: "home" | "away" }) {
  if (lista.length === 0) return <div />;
  const apellido = (n: string | null) =>
    (n ?? "").replace(/^([A-Z]\.\s?)+/, "").split(" ").slice(-1)[0] || n || "";
  return (
    <ul className="ficha__entradas" data-side={lado}>
      {lista.map((e) => (
        <li key={e.key}>
          <span className="ficha__entmin">▲{e.minute ?? "?"}&apos;</span>
          <span className="ficha__entavatar">
            {e.photo ? (
              <Image src={e.photo} alt="" width={28} height={28} unoptimized />
            ) : (
              <span>{e.number ?? ""}</span>
            )}
          </span>
          <span className="ficha__enttxt">
            <b>
              {e.number != null && <span className="ficha__entnum">{e.number}</span>} {apellido(e.name)}
            </b>
            {e.porQuien && <small>por {apellido(e.porQuien)}</small>}
          </span>
          <span className="ficha__entdatos">
            {e.goals > 0 && <span title="Goles">⚽{e.goals > 1 ? e.goals : ""}</span>}
            {e.assists > 0 && <span title="Asistencias">🅰️{e.assists > 1 ? e.assists : ""}</span>}
            {e.red > 0 ? (
              <span className="ficha__card ficha__card--inline ficha__card--red" />
            ) : e.yellow > 0 ? (
              <span className="ficha__card ficha__card--inline" />
            ) : null}
            {e.rating != null && (
              <span
                className="ficha__rating ficha__rating--inline"
                data-tier={e.rating >= 7 ? "good" : e.rating >= 6 ? "ok" : "bad"}
              >
                {e.rating.toFixed(1)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlayerChip({ p, x, y }: { p: Chip; x: number; y: number }) {
  const short = p.name.replace(/^([A-Z]\.\s?)+/, "").split(" ").slice(-1)[0] || p.name;
  return (
    <div className="ficha__chip" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="ficha__avatar">
        {p.photo ? (
          <Image src={p.photo} alt="" width={40} height={40} unoptimized />
        ) : (
          <span>{p.number ?? ""}</span>
        )}
        {p.rating != null && (
          <span
            className="ficha__rating"
            data-tier={p.rating >= 7 ? "good" : p.rating >= 6 ? "ok" : "bad"}
          >
            {p.rating.toFixed(1)}
          </span>
        )}
        {p.red > 0 ? (
          <span className="ficha__card ficha__card--red" />
        ) : p.yellow > 0 ? (
          <span className="ficha__card" />
        ) : null}
        {p.goals > 0 && <span className="ficha__goalmark">⚽{p.goals > 1 ? p.goals : ""}</span>}
        {p.subbedOut != null && (
          <span className="ficha__submark ficha__submark--out">▼{p.subbedOut}&apos;</span>
        )}
      </div>
      <span className="ficha__chipname">
        {p.number != null && <b>{p.number}</b>} {short}
      </span>
    </div>
  );
}

function num(v: number | string | null): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}
