import Image from "next/image";
import { puntosPronostico, type Baremo } from "@/lib/quiniela-liga/scoring";

/**
 * Vista "Selecciones" de la quiniela de clubes: por cada partido ya empezado
 * (en vivo o terminado), el marcador real y lo que pronosticó CADA miembro de
 * la liga. Los que no han arrancado no aparecen — la RLS oculta esos picks
 * hasta el inicio (anti-copia).
 */

export type SeleccionMember = { userId: string; displayName: string };

export type SeleccionMatch = {
  id: number;
  kickoffAt: string;
  homeName: string;
  homeLogo: string | null;
  awayName: string;
  awayLogo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  finished: boolean;
  live: boolean;
  minute: number | null;
  compLabel: string;
  picks: Map<string, { home: number; away: number }>;
};

// Puntuación: SIEMPRE la librería compartida con el baremo de la liga activa.
// La copia local que había aquí llevaba 3/1 a fuego y mentía en cuanto una
// liga cambiaba sus normas (CONOS pasó a 5/2 y las tarjetas seguían en +3/+1
// mientras la clasificación, que calcula en SQL, iba bien).

const TIME_FMT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
function formatKickoff(iso: string) {
  return TIME_FMT.format(new Date(iso)).replace(",", "").replace(/^./, (c) => c.toUpperCase());
}

export default function SeleccionesView({
  matches,
  members,
  currentUserId,
  baremo,
}: {
  matches: SeleccionMatch[];
  members: SeleccionMember[];
  currentUserId: string;
  /** Normas de la liga ACTIVA — cada quiniela puntúa con las suyas. */
  baremo: Baremo;
}) {
  if (members.length === 0) return <EmptyPanel>Aún no hay nadie en la quiniela.</EmptyPanel>;
  if (matches.length === 0) {
    return (
      <EmptyPanel>
        Todavía no ha empezado ningún partido. En cuanto arranque LaLiga verás
        aquí lo que eligió cada miembro de la liga.
      </EmptyPanel>
    );
  }

  const anyLive = matches.some((m) => m.live);

  return (
    <div className="space-y-3">
      <p className="hint" style={{ marginTop: 0 }}>
        Lo que eligió cada uno en los partidos en vivo y ya jugados. Toca un
        partido para desplegarlo. Los que no han empezado se ocultan hasta el
        inicio.
      </p>
      {matches.map((m, i) => (
        <MatchBlock
          key={m.id}
          match={m}
          members={members}
          currentUserId={currentUserId}
          baremo={baremo}
          defaultOpen={m.live || (!anyLive && i === 0)}
        />
      ))}
    </div>
  );
}

function MatchBlock({
  match,
  members,
  currentUserId,
  baremo,
  defaultOpen,
}: {
  match: SeleccionMatch;
  members: SeleccionMember[];
  currentUserId: string;
  baremo: Baremo;
  defaultOpen: boolean;
}) {
  const hasScore = match.scoreHome != null && match.scoreAway != null;

  const ordered = members
    .map((mem, idx) => {
      const pick = match.picks.get(mem.userId) ?? null;
      const pts =
        hasScore && pick
          ? puntosPronostico(pick, { home: match.scoreHome!, away: match.scoreAway! }, baremo)
          : null;
      return { mem, idx, pick, pts };
    })
    .sort((a, b) => {
      const ap = a.pick ? 1 : 0;
      const bp = b.pick ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const apt = a.pts ?? -1;
      const bpt = b.pts ?? -1;
      if (apt !== bpt) return bpt - apt;
      return a.idx - b.idx;
    });

  const predictedCount = ordered.filter((o) => o.pick).length;

  return (
    <details className="panel" open={defaultOpen} style={{ padding: 0, overflow: "hidden" }}>
      <summary
        className="flex items-center justify-between gap-3"
        style={{ padding: "14px 16px", cursor: "pointer", listStyle: "none" }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow" style={{ marginBottom: 4, fontSize: "0.66rem" }}>
            {match.compLabel}
            {!match.live && !match.finished ? ` · ${formatKickoff(match.kickoffAt)}` : ""}
          </p>
          <div className="flex items-center gap-2" style={{ fontWeight: 700, fontSize: "1rem" }}>
            {match.homeLogo && <Image src={match.homeLogo} alt="" width={18} height={18} unoptimized />}
            <span className="truncate">{match.homeName}</span>
            <span className="tabular-nums" style={{ color: hasScore ? "var(--text)" : "var(--text-dim)", padding: "0 4px" }}>
              {hasScore ? `${match.scoreHome}–${match.scoreAway}` : "vs"}
            </span>
            <span className="truncate">{match.awayName}</span>
            {match.awayLogo && <Image src={match.awayLogo} alt="" width={18} height={18} unoptimized />}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {match.live ? (
            <span className="badge badge--danger">
              <span className="livepulse" />
              {match.minute != null ? `${match.minute}'` : "EN VIVO"}
            </span>
          ) : match.finished ? (
            <span className="badge">Final</span>
          ) : null}
          <span className="hint tabular-nums" style={{ fontSize: "0.72rem" }}>
            {predictedCount}👤
          </span>
        </div>
      </summary>

      <div style={{ borderTop: "1px solid var(--line)" }}>
        {predictedCount === 0 ? (
          <p className="hint" style={{ padding: 16, margin: 0, textAlign: "center" }}>
            Nadie de la liga pronosticó este partido.
          </p>
        ) : (
          <ul
            className="grid gap-x-4 gap-y-0 sm:grid-cols-2"
            style={{ listStyle: "none", margin: 0, padding: "6px 16px 12px" }}
          >
            {ordered.map(({ mem, pick, pts }) => {
              const isMe = mem.userId === currentUserId;
              return (
                <li
                  key={mem.userId}
                  className="flex items-center justify-between gap-2"
                  style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="truncate" style={{ minWidth: 0 }}>
                    {mem.displayName}
                    {isMe && <span className="badge badge--accent" style={{ marginLeft: 6 }}>Tú</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {pick ? (
                      <b className="tabular-nums" style={{ color: pickColor(pts, baremo) }}>
                        {pick.home}–{pick.away}
                      </b>
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                    {pts != null && (
                      <span className={`badge ${pts === baremo.exacto ? "badge--ok" : pts > 0 ? "badge--accent" : ""}`}>
                        {match.finished ? "" : "va "}
                        {pts > 0 ? `+${pts}` : pts}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}

function pickColor(pts: number | null, baremo: Baremo): string {
  if (pts === null) return "var(--text)";
  if (pts === baremo.exacto) return "#4ade80";
  if (pts > 0) return "var(--accent)";
  return "var(--text-dim)";
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="panel"
      style={{ padding: 32, textAlign: "center", borderStyle: "dashed", color: "var(--text-dim)" }}
    >
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  );
}
