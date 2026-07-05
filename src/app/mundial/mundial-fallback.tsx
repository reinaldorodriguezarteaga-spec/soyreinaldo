import type { FbGroup, FbMatch, WcFallback } from "@/lib/sports/wc-fallback";

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

/**
 * Vista de respaldo del Mundial cuando API-Football no responde: calendario,
 * resultados y grupos desde nuestra base de datos. Sin escudos ni marcador en
 * vivo, pero la web no se queda vacía.
 */
export default function MundialFallback({ data }: { data: WcFallback }) {
  const recientes = data.finished.slice(0, 24);

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="wrap space-y-8">
        <div className="notice" style={{ borderColor: "var(--accent-2)" }}>
          <p style={{ margin: 0 }}>
            ⚠️ Los datos en vivo están temporalmente no disponibles. Mostramos el
            calendario y los últimos resultados guardados.
          </p>
        </div>

        {data.upcoming.length > 0 && (
          <div>
            <div className="shead">
              <h2>Próximos partidos</h2>
            </div>
            <div className="grid2">
              {data.upcoming.map((m) => (
                <FbCard key={m.id} m={m} />
              ))}
            </div>
          </div>
        )}

        {recientes.length > 0 && (
          <div>
            <div className="shead">
              <h2>Resultados</h2>
              <span className="sh-note">últimos jugados</span>
            </div>
            <div className="grid2">
              {recientes.map((m) => (
                <FbCard key={m.id} m={m} />
              ))}
            </div>
          </div>
        )}

        {data.groups.length > 0 && (
          <div>
            <div className="shead">
              <h2>Grupos</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.groups.map((g) => (
                <FbGroupTable key={g.letter} group={g} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FbCard({ m }: { m: FbMatch }) {
  const showScore = m.finished && m.homeGoals != null && m.awayGoals != null;
  const homeWon = showScore && m.homeGoals! > m.awayGoals!;
  const awayWon = showScore && m.awayGoals! > m.homeGoals!;
  return (
    <div className="match">
      <div className="match__meta">
        <span className="match__grp">{m.round}</span>
        {m.finished ? (
          <span className="badge">Final</span>
        ) : (
          <span className="match__when">{formatKickoff(m.kickoff)}</span>
        )}
      </div>
      <div className="team">
        <span className="flag" aria-hidden>
          {m.homeFlag}
        </span>
        <span
          className="tn"
          style={showScore && !homeWon ? { color: "var(--text-dim)" } : undefined}
        >
          {m.homeName}
        </span>
      </div>
      <div className="score">
        {showScore ? (
          <>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
              {m.homeGoals}
            </b>
            <span className="vs">–</span>
            <b style={{ fontFamily: "var(--font-display-stack)", fontSize: "1.3rem" }}>
              {m.awayGoals}
            </b>
          </>
        ) : (
          <span className="vs">VS</span>
        )}
      </div>
      <div className="team right">
        <span
          className="tn"
          style={showScore && !awayWon ? { color: "var(--text-dim)" } : undefined}
        >
          {m.awayName}
        </span>
        <span className="flag" aria-hidden>
          {m.awayFlag}
        </span>
      </div>
    </div>
  );
}

function FbGroupTable({ group }: { group: FbGroup }) {
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
        Grupo {group.letter}
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
          {group.rows.map((r, i) => (
            <tr key={r.code}>
              <td>{i + 1}</td>
              <td>
                <span className="club">
                  <span aria-hidden style={{ fontSize: "1.1rem" }}>
                    {r.flag}
                  </span>
                  <b>{r.name}</b>
                </span>
              </td>
              <td className="tabular-nums" style={{ color: "var(--text-dim)" }}>
                {r.pj}
              </td>
              <td
                className="tabular-nums"
                style={{
                  color:
                    r.dg > 0 ? "#4ade80" : r.dg < 0 ? "#ff8a8a" : "var(--text-dim)",
                }}
              >
                {r.dg > 0 ? "+" : ""}
                {r.dg}
              </td>
              <td className="ptsc">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
