import Link from "next/link";
import { labelForKey, type PhaseKey } from "@/lib/quiniela/phases";

/**
 * Vista "Mis predicciones": la lista personal del usuario con todos sus
 * pronósticos de marcador y los puntos que sacó. A diferencia de "Selecciones"
 * (todos los miembros), aquí solo se ven los del propio usuario — por eso sí
 * se muestran también los partidos que todavía no han empezado.
 */

export type MiPrediccion = {
  matchId: number;
  phase: PhaseKey;
  kickoffAt: string;
  homeName: string;
  homeFlag: string;
  awayName: string;
  awayFlag: string;
  predHome: number;
  predAway: number;
  scoreHome: number | null;
  scoreAway: number | null;
  finished: boolean;
  live: boolean;
  minute: number | null;
};

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

export default function MisPrediccionesView({
  rows,
}: {
  rows: MiPrediccion[];
}) {
  if (rows.length === 0) {
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
        <p style={{ margin: 0 }}>
          Todavía no hay partidos jugados que hayas pronosticado.
        </p>
        <p className="hint" style={{ marginTop: 8 }}>
          <Link href="/quiniela/partidos" style={{ color: "var(--accent)" }}>
            Ir a Pronósticos →
          </Link>
        </p>
      </div>
    );
  }

  let earned = 0;
  let scored = 0;
  for (const r of rows) {
    if (r.finished && r.scoreHome != null && r.scoreAway != null) {
      earned += computePoints(
        r.scoreHome,
        r.scoreAway,
        r.predHome,
        r.predAway,
      );
      scored += 1;
    }
  }

  return (
    <>
      <div className="shead" style={{ marginBottom: 14 }}>
        <h2>Mis predicciones</h2>
        <span className="sh-note">
          {rows.length} partido{rows.length === 1 ? "" : "s"} · {earned} pts en{" "}
          {scored} terminado{scored === 1 ? "" : "s"}
        </span>
      </div>
      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="board">
          <thead>
            <tr>
              <th>Partido</th>
              <th className="text-right">Mi pick</th>
              <th className="text-right">Real</th>
              <th className="text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const hasReal = r.scoreHome != null && r.scoreAway != null;
              const pts =
                hasReal && (r.finished || r.live)
                  ? computePoints(
                      r.scoreHome!,
                      r.scoreAway!,
                      r.predHome,
                      r.predAway,
                    )
                  : null;
              return (
                <tr key={r.matchId}>
                  <td className="who">
                    <span style={{ display: "block" }}>
                      {r.homeFlag} {r.homeName} – {r.awayName} {r.awayFlag}
                    </span>
                    <span
                      className="hint"
                      style={{ fontSize: "0.72rem", display: "block" }}
                    >
                      {labelForKey(r.phase)}
                      {!r.live ? ` · ${formatKickoff(r.kickoffAt)}` : ""}
                      {r.live && (
                        <span
                          className="badge badge--danger"
                          style={{ marginLeft: 6 }}
                        >
                          <span className="livepulse" />
                          {r.minute != null ? `${r.minute}'` : "EN VIVO"}
                        </span>
                      )}
                      {r.finished && (
                        <span className="badge" style={{ marginLeft: 6 }}>
                          Final
                        </span>
                      )}
                    </span>
                  </td>
                  <td
                    className="text-right tabular-nums"
                    style={{ fontWeight: 700 }}
                  >
                    {r.predHome}–{r.predAway}
                  </td>
                  <td
                    className="text-right tabular-nums"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {hasReal ? `${r.scoreHome}–${r.scoreAway}` : "—"}
                  </td>
                  <td className="pts">
                    {pts == null ? (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    ) : (
                      <span
                        className={`badge ${
                          pts === 3
                            ? "badge--ok"
                            : pts === 1
                              ? "badge--accent"
                              : ""
                        }`}
                        title={r.finished ? "Puntos" : "Va ganando (en vivo)"}
                      >
                        {r.finished ? "" : "va "}
                        {pts > 0 ? `+${pts}` : pts}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
