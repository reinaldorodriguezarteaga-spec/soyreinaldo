import Image from "next/image";
import Link from "next/link";
import { competicionEs, type EstadisticaJugadorApi } from "@/lib/sports/api-football";
import { esAmistoso, nombreTemporada, sumar, type Totales } from "@/lib/comparador/datos";

/**
 * La temporada del jugador en TODAS sus competiciones (4-nov, pedido del
 * dueño: la ficha solo enseñaba la liga). Una fila por competición (liga,
 * Champions, Copa del Rey, Supercopa, selección…) y la suma de todas debajo,
 * con selector de temporada. Los datos llegan ya limpios de duplicados
 * (`sinDuplicados`) y con los torneos de verano en su sitio; los amistosos no
 * cuentan, igual que en el comparador.
 */
export default function TemporadaCompeticiones({
  filas,
  temporada,
  temporadas,
  base,
}: {
  filas: EstadisticaJugadorApi[];
  temporada: number;
  temporadas: number[];
  /** Ruta de la ficha, para los enlaces del selector. */
  base: string;
}) {
  const oficiales = filas
    .filter((s) => !esAmistoso(s) && (s.games.appearences ?? 0) > 0)
    .sort((a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0));
  const total = sumar(oficiales);

  return (
    <>
      {temporadas.length > 1 && (
        <nav className="jtemp" aria-label="Temporada">
          {temporadas.slice(0, 10).map((s) => (
            <Link
              key={s}
              href={`${base}?temporada=${s}`}
              className={`jtemp__chip${s === temporada ? " on" : ""}`}
              aria-current={s === temporada ? "page" : undefined}
              scroll={false}
            >
              {nombreTemporada(s)}
            </Link>
          ))}
        </nav>
      )}

      <div className="panel" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div className="shead" style={{ padding: "12px 16px 0" }}>
          <h2 style={{ fontSize: "1.05rem" }}>Temporada {nombreTemporada(temporada)}</h2>
        </div>
        {oficiales.length === 0 ? (
          <p style={{ padding: "12px 16px 16px", color: "var(--text-dim)", margin: 0 }}>
            Sin partidos oficiales en esta temporada.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="jtabla">
              <thead>
                <tr>
                  <th>Competición</th>
                  <th title="Partidos">PJ</th>
                  <th title="Minutos">Min</th>
                  <th title="Goles">G</th>
                  <th title="Asistencias">A</th>
                  <th title="Amarillas">TA</th>
                  <th title="Rojas">TR</th>
                </tr>
              </thead>
              <tbody>
                {oficiales.map((s, i) => (
                  <tr key={`${s.league.id ?? s.league.name}-${s.team.id ?? s.team.name}-${i}`}>
                    <td>
                      <span className="jtabla__comp">
                        {s.league.logo && <Image src={s.league.logo} alt="" width={18} height={18} unoptimized />}
                        <span>
                          {competicionEs(s.league.name)}
                          <small>{s.team.name}</small>
                        </span>
                      </span>
                    </td>
                    <td>{s.games.appearences ?? 0}</td>
                    <td>{s.games.minutes ?? 0}</td>
                    <td>{s.goals.total ?? 0}</td>
                    <td>{s.goals.assists ?? 0}</td>
                    <td>{s.cards.yellow ?? 0}</td>
                    <td>{(s.cards.red ?? 0) + (s.cards.yellowred ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              {oficiales.length > 1 && (
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{total.partidos}</td>
                    <td>{total.minutos}</td>
                    <td>{total.goles}</td>
                    <td>{total.asistencias ?? 0}</td>
                    <td>{total.amarillas}</td>
                    <td>{total.rojas}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {oficiales.length > 0 && <DetalleTotales t={total} />}
    </>
  );
}

/** El resto de números de la temporada, sumando todas las competiciones. */
function DetalleTotales({ t }: { t: Totales }) {
  const lineas: { label: string; value: string | number | null }[] = [
    { label: "Titularidades", value: t.titular },
    { label: "Tiros", value: t.tiros != null ? (t.tirosPuerta != null ? `${t.tiros} (${t.tirosPuerta} a puerta)` : t.tiros) : null },
    { label: "Pases clave", value: t.pasesClave },
    { label: "Regates completados", value: t.regates },
    { label: "Duelos ganados", value: t.duelosGanados },
    { label: "Entradas", value: t.entradas },
    { label: "Intercepciones", value: t.intercepciones },
    { label: "Faltas recibidas", value: t.faltasRecibidas },
    {
      label: "Penaltis",
      value: t.penMarcados != null ? `${t.penMarcados}/${t.penMarcados + (t.penFallados ?? 0)}` : null,
    },
    { label: "Paradas", value: t.paradas || null },
    { label: "Goles encajados", value: t.paradas ? t.encajados : null },
  ].filter((l) => l.value != null && l.value !== "");

  return (
    <div className="panel" style={{ overflow: "hidden", marginBottom: 24 }}>
      <div className="shead" style={{ padding: "12px 16px 0" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Totales de la temporada</h2>
        {t.valoracion != null && (
          <span
            className="tabular-nums"
            style={{ background: "#4ade80", color: "#0a1030", borderRadius: 8, padding: "2px 8px", fontWeight: 800 }}
          >
            {t.valoracion.toFixed(2)}
          </span>
        )}
      </div>
      <p style={{ margin: "4px 16px 0", color: "var(--text-dim)", fontSize: "0.8rem" }}>Todas las competiciones</p>
      <div style={{ padding: "8px 0 0" }}>
        {lineas.map((l, i) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 16px",
              borderTop: i > 0 ? "1px solid var(--line)" : undefined,
              fontSize: "0.9rem",
            }}
          >
            <span style={{ color: "var(--text-dim)" }}>{l.label}</span>
            <b className="tabular-nums">{l.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
