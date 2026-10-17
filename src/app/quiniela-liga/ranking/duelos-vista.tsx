import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ganadorDuelo,
  MAX_RETOS_POR_JORNADA,
  PREMIO_DUELOS,
  tablaDuelos,
  type Duelo,
} from "@/lib/quiniela-liga/duelos";
import { FormRetar, ResponderReto, RetirarReto } from "./duelos-botones";
import BotonCompartir from "@/components/BotonCompartir";

/**
 * Pestaña "Duelos" de la clasificación: retos pendientes, duelos de la
 * jornada, resultados y la tabla de la temporada (el primero suma
 * PREMIO_DUELOS puntos al final).
 */
export default async function DuelosVista({
  leagueId,
  meId,
  miembros,
}: {
  leagueId: string;
  meId: string | null;
  miembros: { id: string; nombre: string }[];
}) {
  const supabase = await createClient();
  const esMiembro = !!meId && miembros.some((m) => m.id === meId);
  const [{ data: dData }, { data: jornada }] = await Promise.all([
    esMiembro ? supabase.rpc("lq_duelos_liga", { p_league_id: leagueId }) : Promise.resolve({ data: [] }),
    supabase.rpc("lq_jornada_retable"),
  ]);
  const duelos = ((dData ?? []) as Duelo[]).filter((d) => d.estado !== "rechazado");
  const tabla = tablaDuelos(duelos);
  const proxima = (jornada as number | null) ?? null;

  const recibidos = duelos.filter((d) => d.estado === "pendiente" && d.rival === meId && !d.empezada);
  const enviados = duelos.filter((d) => d.estado === "pendiente" && d.retador === meId && !d.empezada);
  const misActivos = duelos.filter(
    (d) => d.estado === "aceptado" && !d.terminada && (d.retador === meId || d.rival === meId),
  );
  const resultados = duelos.filter((d) => d.estado === "aceptado" && d.terminada).slice(0, 20);
  const yaRetados = new Set(
    duelos
      .filter((d) => d.matchday === proxima && (d.retador === meId || d.rival === meId))
      .map((d) => (d.retador === meId ? d.rival : d.retador)),
  );
  const misRetos = duelos.filter((d) => d.matchday === proxima && d.retador === meId).length;
  const rivales = miembros.filter((m) => m.id !== meId && !yaRetados.has(m.id));

  // Enlace para retar a alguien de fuera (17-oct): /reto/<usuario>.
  const { data: miPerfil } = esMiembro
    ? await supabase.from("profiles").select("username").eq("id", meId!).maybeSingle<{ username: string | null }>()
    : { data: null };
  const { data: ligaInfo } = esMiembro
    ? await supabase.from("leagues").select("is_public").eq("id", leagueId).maybeSingle<{ is_public: boolean }>()
    : { data: null };
  const enlaceReto = esMiembro
    ? `https://www.soyreinaldo.com/reto/${encodeURIComponent(miPerfil?.username || meId!)}${
        ligaInfo?.is_public ? "" : `?liga=${encodeURIComponent(leagueId)}`
      }`
    : null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="panel duelo__intro">
        <p style={{ margin: 0 }}>
          <strong>⚔️ Duelos:</strong> reta a alguien de tu liga para una jornada. Gana quien más
          puntos saque en ella. Al final de la temporada, <strong>quien más duelos gane suma {PREMIO_DUELOS} puntos</strong> a
          la general.
        </p>
      </div>

      {!esMiembro ? (
        <div className="panel" style={{ padding: 20, textAlign: "center", color: "var(--text-dim)" }}>
          {meId ? "Únete a esta liga para retar a sus jugadores." : "Inicia sesión para ver y lanzar duelos."}
        </div>
      ) : (
        <>
          {recibidos.length > 0 && (
            <section className="panel duelo__bloque duelo__bloque--aviso">
              <h3>Te han retado</h3>
              {recibidos.map((d) => (
                <div key={d.id} className="duelo__fila">
                  <span>
                    <strong>{d.retador_nombre}</strong> te reta en la jornada {d.matchday}
                  </span>
                  <ResponderReto id={d.id} />
                </div>
              ))}
            </section>
          )}

          {proxima != null && (
            <section className="panel duelo__bloque">
              <h3>Lanzar un reto · jornada {proxima}</h3>
              {misRetos >= MAX_RETOS_POR_JORNADA ? (
                <p className="duelo__nota">Ya has lanzado {MAX_RETOS_POR_JORNADA} retos esta jornada.</p>
              ) : rivales.length === 0 ? (
                <p className="duelo__nota">No queda nadie a quien retar en esta liga.</p>
              ) : (
                <FormRetar leagueId={leagueId} rivales={rivales} jornada={proxima} />
              )}
              {enviados.map((d) => (
                <div key={d.id} className="duelo__fila">
                  <span>
                    Esperando a <strong>{d.rival_nombre}</strong> (J{d.matchday})
                  </span>
                  <RetirarReto id={d.id} />
                </div>
              ))}
              <p className="duelo__nota">
                Hasta {MAX_RETOS_POR_JORNADA} retos por jornada. Se acepta hasta que empiece su primer partido.
              </p>
              {enlaceReto && (
                <div className="duelo__fila">
                  <span>¿Tu amigo aún no juega? Mándale tu enlace de reto:</span>
                  <BotonCompartir
                    url={enlaceReto}
                    texto={`⚔️ Te reto en la jornada ${proxima} de los pronósticos de soyreinaldo.com. ¿Aceptas?`}
                    etiqueta="Retar a un amigo"
                  />
                </div>
              )}
            </section>
          )}

          {misActivos.length > 0 && (
            <section className="panel duelo__bloque">
              <h3>Tus duelos en juego</h3>
              {misActivos.map((d) => (
                <FilaResultado key={d.id} d={d} meId={meId} />
              ))}
            </section>
          )}

          <section className="panel" style={{ overflowX: "auto" }}>
            <p style={{ margin: 0, padding: "12px 16px 0", color: "var(--text-dim)", fontSize: "0.88rem" }}>
              Tabla de duelos · el primero al final suma {PREMIO_DUELOS} puntos
            </p>
            {tabla.length === 0 ? (
              <p className="duelo__nota" style={{ padding: "12px 16px 16px" }}>
                Aún no ha terminado ningún duelo. ¡Lanza el primero!
              </p>
            ) : (
              <table className="board">
                <thead>
                  <tr>
                    <th className="pos">#</th>
                    <th>Jugador</th>
                    <th style={{ textAlign: "right" }}>E</th>
                    <th style={{ textAlign: "right" }}>P</th>
                    <th className="pts">G</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map((f, i) => (
                    <tr key={f.userId} className={f.userId === meId ? "me" : undefined}>
                      <td className={`pos${i < 3 ? " top" : ""}`}>{i + 1}</td>
                      <td className="who">{f.nombre}</td>
                      <td style={{ textAlign: "right" }}>{f.empatados}</td>
                      <td style={{ textAlign: "right" }}>{f.perdidos}</td>
                      <td className="pts">{f.ganados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {resultados.length > 0 && (
            <section className="panel duelo__bloque">
              <h3>Últimos resultados</h3>
              {resultados.map((d) => (
                <FilaResultado key={d.id} d={d} meId={meId} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FilaResultado({ d, meId }: { d: Duelo; meId: string | null }) {
  const g = ganadorDuelo(d);
  const marca = (id: string) => (g === id ? " 🏆" : "");
  return (
    <div className={`duelo__fila${d.retador === meId || d.rival === meId ? " mio" : ""}`}>
      <span className="mono duelo__j">J{d.matchday}</span>
      <span className="duelo__vs">
        {d.retador_nombre}
        {marca(d.retador)} <strong>{d.pts_retador}</strong> – <strong>{d.pts_rival}</strong>{" "}
        {d.rival_nombre}
        {marca(d.rival)}
      </span>
      {!d.terminada && <span className="mono duelo__nota">{d.empezada ? "en juego" : "por empezar"}</span>}
      {g === meId && (
        <Link href={`/logro/duelo/${d.id}`} className="mono duelo__compartir">
          Compartir ↗
        </Link>
      )}
    </div>
  );
}
