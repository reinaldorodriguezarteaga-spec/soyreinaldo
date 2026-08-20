import type { StandingRow } from "@/lib/sports/api-football";

/**
 * "Si gana, sube a 4º".
 *
 * Lo que de verdad se juega un equipo en un partido no es el marcador, es la
 * tabla — y hasta ahora había que ir a mirarla y calcularlo a ojo. Se resuelve
 * con la clasificación que ya está cacheada (`sports_cache`), así que no
 * cuesta ni una llamada más a la API.
 *
 * Es una PROYECCIÓN, y se dice: se recalculan los puntos y se reordena, pero
 * la diferencia de goles se deja como está (no sabemos por cuánto va a ganar)
 * y LaLiga desempata por enfrentamientos directos, no por diferencia general.
 * Sirve para orientar, no para discutir.
 */

type Escenario = { etiqueta: string; puestoLocal: number; puestoVisitante: number };

function posiciones(
  rows: StandingRow[],
  homeId: number,
  awayId: number,
  ptsHome: number,
  ptsAway: number,
): { local: number; visitante: number } {
  const proyectada = rows.map((r) => ({
    id: r.team.id,
    points: r.points + (r.team.id === homeId ? ptsHome : r.team.id === awayId ? ptsAway : 0),
    gd: r.goalsDiff,
    gf: r.all.goals.for,
  }));
  proyectada.sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );
  return {
    local: proyectada.findIndex((t) => t.id === homeId) + 1,
    visitante: proyectada.findIndex((t) => t.id === awayId) + 1,
  };
}

export default function StandingsImpact({
  rows,
  home,
  away,
}: {
  rows: StandingRow[];
  home: { id: number; name: string };
  away: { id: number; name: string };
}) {
  const filaLocal = rows.find((r) => r.team.id === home.id);
  const filaVisitante = rows.find((r) => r.team.id === away.id);
  // Sin los dos equipos en la tabla no hay nada que proyectar. Y con la liga
  // recién empezada (todos a cero) la proyección es ruido, así que se calla.
  if (!filaLocal || !filaVisitante) return null;
  if (rows.every((r) => r.all.played === 0)) return null;

  const gana = posiciones(rows, home.id, away.id, 3, 0);
  const empate = posiciones(rows, home.id, away.id, 1, 1);
  const pierde = posiciones(rows, home.id, away.id, 0, 3);

  const escenarios: Escenario[] = [
    { etiqueta: `Gana ${home.name}`, puestoLocal: gana.local, puestoVisitante: gana.visitante },
    { etiqueta: "Empate", puestoLocal: empate.local, puestoVisitante: empate.visitante },
    { etiqueta: `Gana ${away.name}`, puestoLocal: pierde.local, puestoVisitante: pierde.visitante },
  ];

  const flecha = (nuevo: number, actual: number) => {
    if (nuevo < actual) return { simbolo: "↑", color: "var(--accent)" };
    if (nuevo > actual) return { simbolo: "↓", color: "var(--text-dim)" };
    return { simbolo: "=", color: "var(--text-dim)" };
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2>Qué se juegan</h2>
        <span className="sh-note">
          {filaLocal.rank}º y {filaVisitante.rank}º ahora mismo
        </span>
      </div>
      <div className="panel" style={{ padding: "6px 0", overflowX: "auto" }}>
        <table className="board" style={{ minWidth: 380 }}>
          <thead>
            <tr>
              <th>Resultado</th>
              <th style={{ textAlign: "right" }}>{home.name}</th>
              <th style={{ textAlign: "right" }}>{away.name}</th>
            </tr>
          </thead>
          <tbody>
            {escenarios.map((e) => {
              const fl = flecha(e.puestoLocal, filaLocal.rank);
              const fv = flecha(e.puestoVisitante, filaVisitante.rank);
              return (
                <tr key={e.etiqueta}>
                  <td className="who">{e.etiqueta}</td>
                  <td style={{ textAlign: "right", color: fl.color }}>
                    {fl.simbolo} {e.puestoLocal}º
                  </td>
                  <td style={{ textAlign: "right", color: fv.color }}>
                    {fv.simbolo} {e.puestoVisitante}º
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p
        style={{
          color: "var(--text-dim)",
          fontSize: "0.78rem",
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        Proyección por puntos. No cuenta la diferencia de goles del propio
        partido ni los desempates por enfrentamiento directo.
      </p>
    </div>
  );
}
