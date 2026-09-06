import Image from "next/image";
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
 * Marcador arriba, campo vertical con las alineaciones a la izquierda
 * (foto, dorsal, nota, goles, tarjetas, quién entró por quién) y las
 * estadísticas con barras a la derecha, estiradas a la misma altura que el
 * campo (sin lista de cambios: el dueño la quiso fuera de esta versión).
 */

type Team = { id: number; name: string; logo: string };

export type FichaStatRow = {
  label: string;
  pct?: boolean;
  home: number | string | null;
  away: number | string | null;
};

export type FichaGoal = { minute: number | null; player: string; tag: string };

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
  /** minuto en que entró, si es un sustituto ocupando el sitio de otro */
  subbedIn: number | null;
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
  homeGoals,
  awayGoals,
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
  homeGoals: FichaGoal[];
  awayGoals: FichaGoal[];
  subs: FixtureSubEvent[];
  statusLabel: string;
}) {
  const homeChips = onPitch(homeLineup, homePlayers, subs.filter((s) => s.teamId === home.id));
  const awayChips = onPitch(awayLineup, awayPlayers, subs.filter((s) => s.teamId === away.id));

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
          {(homeGoals.length > 0 || awayGoals.length > 0) && (
            <div className="ficha__goals">
              <ul>
                {homeGoals.map((g, i) => (
                  <li key={i}>
                    ⚽ {g.player} {g.tag} {g.minute != null && `${g.minute}'`}
                  </li>
                ))}
              </ul>
              <ul className="ficha__goals--away">
                {awayGoals.map((g, i) => (
                  <li key={i}>
                    {g.minute != null && `${g.minute}'`} {g.tag} {g.player} ⚽
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                {place(homeChips, false).map(({ p, x, y }) => (
                  <PlayerChip key={p.key} p={p} x={x} y={y} />
                ))}
                {place(awayChips, true).map(({ p, x, y }) => (
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
        <footer className="ficha__foot">
          <span className="mono">soyreinaldo.com</span>
          <span className="mono">@SoyReinaldoR</span>
        </footer>
      </article>
    </FichaFullscreen>
  );
}

/**
 * Los que están en el campo: el once inicial y, en el sitio de cada
 * sustituido, el que entró por él. Los cambios se casan por id de jugador y,
 * si el API no lo trae, por apellido (`subKey`) — solo por apellido fallaba
 * con dos "García" en el mismo equipo (Koundé entró por Eric García y la
 * ficha lo ponía en el sitio de Joan García, el portero).
 */
function onPitch(lineup: LineupTeam | null, players: PlayerRating[], subs: FixtureSubEvent[]): Chip[] {
  if (!lineup || lineup.startXI.length === 0) return [];
  const byId = new Map(players.map((p) => [p.id, p]));
  const byKey = new Map(players.map((p) => [subKey(p.name), p]));
  const rating = (lp: LineupPlayer): PlayerRating | undefined => byId.get(lp.id) ?? byKey.get(subKey(lp.name));

  const toChip = (lp: LineupPlayer, subbedIn: number | null): Chip => {
    const pr = rating(lp);
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
      subbedIn,
    };
  };

  // Cambios encadenados (A sale por B, luego B sale por C): se resuelve en orden.
  const benchById = new Map(lineup.substitutes.map((p) => [p.id, p]));
  const benchByKey = new Map(lineup.substitutes.map((p) => [subKey(p.name), p]));
  const slots: { current: LineupPlayer; subbedIn: number | null; grid: string | null }[] =
    lineup.startXI.map((p) => ({ current: p, subbedIn: null, grid: p.grid }));
  for (const s of subs) {
    const inP =
      (s.inId != null ? benchById.get(s.inId) : undefined) ?? benchByKey.get(subKey(s.inName));
    const slot =
      (s.outId != null ? slots.find((sl) => sl.current.id === s.outId) : undefined) ??
      slots.find((sl) => subKey(sl.current.name) === subKey(s.outName));
    if (!slot || !inP) continue;
    slot.current = inP;
    slot.subbedIn = s.minute;
  }
  return slots.map((sl) => toChip({ ...sl.current, grid: sl.grid }, sl.subbedIn));
}

/** Posiciones (%) desde la rejilla "fila:columna" (fila 1 = portero). El
 * visitante va espejado para que su portero quede abajo. */
function place(chips: Chip[], mirrored: boolean) {
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
      const yHalf = 8 + ((row - 1) / Math.max(nRows - 1, 1)) * 35; // 8%..43% de cada mitad
      const x = ((i + 0.5) / sorted.length) * 100;
      out.push({ p, x: mirrored ? 100 - x : x, y: mirrored ? 100 - yHalf : yHalf });
    });
  }
  return out;
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
        {p.subbedIn != null && <span className="ficha__submark">▲{p.subbedIn}&apos;</span>}
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
