import { clientePublico } from "@/lib/supabase/publico";
import { resumenPorRol, type Fila } from "@/lib/rendimiento/posiciones";

/**
 * «Rendimiento por posición» de la ficha del jugador (20-oct, pedido del
 * dueño): goles, asistencias y nota según dónde jugó, de los partidos con
 * alineación registrada (tabla `apariciones_posicion`, cron `rendimiento`).
 * Sin datos (o con una sola posición y pocos partidos), no pinta nada.
 */
export default async function RendimientoPosicion({ jugador, temporada }: { jugador: number; temporada: number }) {
  const db = clientePublico();
  const { data } = await db
    .from("apariciones_posicion")
    .select("rol, minutos, goles, asistencias, nota")
    .eq("player_id", jugador)
    .eq("season", temporada)
    .returns<Fila[]>();
  const filas = (data ?? []).map((f) => ({ ...f, nota: f.nota == null ? null : Number(f.nota) }));
  if (filas.length < 2) return null;
  const roles = resumenPorRol(filas);
  // Dónde rinde más: más G+A cada 90 entre las posiciones con 180' o más.
  const conMinutos = roles.filter((r) => r.minutos >= 180);
  const mejor =
    roles.length > 1 && conMinutos.length > 1 ? [...conMinutos].sort((a, b) => b.ga90 - a.ga90)[0] : null;

  return (
    <div className="panel" style={{ overflow: "hidden", marginBottom: 24 }}>
      <div className="shead" style={{ padding: "12px 16px 0" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Rendimiento por posición</h2>
        <span className="sh-note">{filas.length} partidos</span>
      </div>
      {mejor && (
        <p style={{ margin: "8px 16px 0", fontSize: "0.88rem", color: "var(--text-dim)" }}>
          Donde más rinde: <b style={{ color: "var(--text)" }}>{mejor.nombre.toLowerCase()}</b> ({mejor.ga90.toFixed(2)}{" "}
          goles + asistencias cada 90 minutos).
        </p>
      )}
      <div style={{ overflowX: "auto" }}>
        <table className="rpos">
          <thead>
            <tr>
              <th>Posición</th>
              <th title="Partidos">PJ</th>
              <th title="Minutos">Min</th>
              <th title="Goles">G</th>
              <th title="Asistencias">A</th>
              <th title="Goles + asistencias cada 90 minutos">G+A/90</th>
              <th title="Nota media">Nota</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.rol} className={mejor?.rol === r.rol ? "rpos--mejor" : undefined}>
                <td>{r.nombre}</td>
                <td>{r.partidos}</td>
                <td>{r.minutos}</td>
                <td>
                  <b>{r.goles}</b>
                </td>
                <td>{r.asistencias}</td>
                <td>{r.ga90.toFixed(2)}</td>
                <td>{r.nota != null ? r.nota.toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: 0, padding: "8px 16px 12px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
        Posición según su sitio en la alineación de cada partido; si entró de cambio, la del jugador al que sustituyó.
      </p>
    </div>
  );
}
