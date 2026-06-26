import Link from "next/link";
import { labelForKey, type PhaseKey } from "@/lib/quiniela/phases";

/**
 * Vista "Selecciones": por cada partido ya empezado (en vivo o terminado),
 * enseña el marcador real y lo que pronosticó CADA miembro de la liga, para no
 * tener que entrar jugador por jugador. Los partidos que aún no han arrancado
 * no aparecen — la RLS oculta esos picks hasta el inicio (no se puede copiar).
 */

export type SeleccionMember = {
  userId: string;
  displayName: string;
};

export type SeleccionMatch = {
  id: number;
  phase: PhaseKey;
  groupLetter: string | null;
  kickoffAt: string;
  homeName: string;
  homeFlag: string;
  awayName: string;
  awayFlag: string;
  scoreHome: number | null;
  scoreAway: number | null;
  finished: boolean;
  live: boolean;
  minute: number | null;
  /** userId -> pick */
  picks: Map<string, { home: number; away: number }>;
};

/** 3 exacto, 1 acierto de signo, 0 fallo. Igual que el resto de la app. */
function computePoints(
  scoreH: number,
  scoreA: number,
  predH: number,
  predA: number,
): number {
  if (scoreH === predH && scoreA === predA) return 3;
  if (Math.sign(scoreH - scoreA) === Math.sign(predH - predA)) return 1;
  return 0;
}

const TIME_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatKickoff(iso: string): string {
  return TIME_FMT.format(new Date(iso))
    .replace(",", "")
    .replace(/^./, (c) => c.toUpperCase());
}

export default function SeleccionesView({
  matches,
  members,
  currentUserId,
}: {
  matches: SeleccionMatch[];
  members: SeleccionMember[];
  currentUserId: string;
}) {
  if (members.length === 0) {
    return (
      <EmptyPanel>Aún no hay nadie en esta liga.</EmptyPanel>
    );
  }
  if (matches.length === 0) {
    return (
      <EmptyPanel>
        Todavía no ha empezado ningún partido. En cuanto arranque uno, aquí
        verás de un vistazo lo que eligió cada miembro de la liga.
      </EmptyPanel>
    );
  }

  return (
    <div className="space-y-5">
      <p className="hint" style={{ marginTop: 0 }}>
        Lo que eligió cada uno en los partidos en vivo y ya jugados. Los que aún
        no han empezado se mantienen ocultos hasta el inicio.
      </p>
      {matches.map((m) => (
        <MatchBlock
          key={m.id}
          match={m}
          members={members}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}

function MatchBlock({
  match,
  members,
  currentUserId,
}: {
  match: SeleccionMatch;
  members: SeleccionMember[];
  currentUserId: string;
}) {
  const hasScore = match.scoreHome != null && match.scoreAway != null;

  // Ordena: primero quien tiene mejor pronóstico (en vivo o final), luego quien
  // tiene pick, y al final quien no pronosticó. Mantiene el orden de ranking
  // como desempate (members ya viene ordenado por la leaderboard).
  const ordered = members
    .map((mem, idx) => {
      const pick = match.picks.get(mem.userId) ?? null;
      const pts =
        hasScore && pick
          ? computePoints(
              match.scoreHome!,
              match.scoreAway!,
              pick.home,
              pick.away,
            )
          : null;
      return { mem, idx, pick, pts };
    })
    .sort((a, b) => {
      const ap = a.pick ? 1 : 0;
      const bp = b.pick ? 1 : 0;
      if (ap !== bp) return bp - ap; // con pick primero
      const apt = a.pts ?? -1;
      const bpt = b.pts ?? -1;
      if (apt !== bpt) return bpt - apt; // más puntos primero
      return a.idx - b.idx; // orden de ranking
    });

  const predictedCount = ordered.filter((o) => o.pick).length;

  return (
    <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
      <header
        className="flex items-center justify-between gap-3"
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--line, #27272a)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            className="eyebrow"
            style={{ marginBottom: 4, fontSize: "0.7rem" }}
          >
            {labelForKey(match.phase)}
            {match.groupLetter ? ` · Grupo ${match.groupLetter}` : ""}
            {!match.live && !match.finished
              ? ` · ${formatKickoff(match.kickoffAt)}`
              : ""}
          </p>
          <div
            className="flex items-center gap-2"
            style={{ fontWeight: 700, fontSize: "1.05rem" }}
          >
            <span className="truncate">
              {match.homeFlag} {match.homeName}
            </span>
            <span
              className="tabular-nums"
              style={{
                color: hasScore ? "var(--text)" : "var(--text-dim)",
                padding: "0 6px",
              }}
            >
              {hasScore ? `${match.scoreHome}–${match.scoreAway}` : "vs"}
            </span>
            <span className="truncate">
              {match.awayName} {match.awayFlag}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          {match.live ? (
            <span className="badge badge--danger">
              <span className="livepulse" />
              {match.minute != null ? `${match.minute}'` : "EN VIVO"}
            </span>
          ) : match.finished ? (
            <span className="badge">Final</span>
          ) : null}
        </div>
      </header>

      {predictedCount === 0 ? (
        <p
          className="hint"
          style={{ padding: "16px", margin: 0, textAlign: "center" }}
        >
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
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Link
                  href={`/quiniela/jugador/${mem.userId}`}
                  className="truncate"
                  style={{ color: "inherit", minWidth: 0 }}
                  title={`Ver los picks de ${mem.displayName}`}
                >
                  {mem.displayName}
                  {isMe && (
                    <span
                      className="badge badge--accent"
                      style={{ marginLeft: 6 }}
                    >
                      Tú
                    </span>
                  )}
                </Link>
                <span className="flex shrink-0 items-center gap-2">
                  {pick ? (
                    <b
                      className="tabular-nums"
                      style={{ color: pickColor(pts) }}
                    >
                      {pick.home}–{pick.away}
                    </b>
                  ) : (
                    <span style={{ color: "var(--text-dim)" }}>—</span>
                  )}
                  {pts != null && (
                    <span
                      className={`badge ${
                        pts === 3
                          ? "badge--ok"
                          : pts === 1
                            ? "badge--accent"
                            : ""
                      }`}
                      title={match.finished ? "Puntos" : "Va ganando (en vivo)"}
                    >
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
  );
}

/** Color del marcador pronosticado según cómo va (en vivo) o cómo quedó. */
function pickColor(pts: number | null): string {
  if (pts === 3) return "#4ade80";
  if (pts === 1) return "var(--accent)";
  if (pts === 0) return "var(--text-dim)";
  return "var(--text)";
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="panel"
      style={{
        padding: 32,
        textAlign: "center",
        borderStyle: "dashed",
        color: "var(--text-dim)",
      }}
    >
      <p style={{ margin: 0 }}>{children}</p>
    </div>
  );
}
