"use client";

import { useEffect, useState } from "react";
import {
  CLUBES_CARRERA,
  LIGAS_INICIO,
  NACIONES,
  NOMBRE_ESCALON,
  clubPorId,
  escudoClub,
  nacionPorCodigo,
  type Escalon,
} from "@/lib/juegos/carrera/clubes";
import {
  EDAD_RETIRO,
  NOMBRE_POSICION,
  crearCarrera,
  decidir,
  elegirOpcion,
  pasarAOfertas,
  puedeRetirarse,
  resumen,
  temporadaTexto,
  type Estado,
  type Posicion,
} from "@/lib/juegos/carrera/motor";

/**
 * Modo carrera (27-oct, pedido del dueño). La partida vive en el navegador:
 * se puede cerrar y seguir otro día.
 */

const CLAVE = "jg-carrera-v1";
const bandera = (c: string) => `https://media.api-sports.io/flags/${c}.svg`;
const POSICIONES: Posicion[] = ["POR", "DEF", "MED", "DEL"];

function leer(): Estado | null {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Estado | null;
    return e && e.v === 1 ? e : null;
  } catch {
    return null;
  }
}
function guardar(e: Estado | null) {
  try {
    if (e) localStorage.setItem(CLAVE, JSON.stringify(e));
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: se juega igual, sin guardar.
  }
}

function Escudo({ id, size = 28 }: { id: number; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API
  return <img src={escudoClub(id)} alt="" width={size} height={size} style={{ objectFit: "contain" }} />;
}

export default function ModoCarrera() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setEstado(leer());
    setCargado(true);
  }, []);

  const actualizar = (e: Estado | null) => {
    setEstado(e);
    guardar(e);
  };

  if (!cargado) return null;
  if (!estado) return <Inicio onEmpezar={actualizar} />;
  return <Partida e={estado} actualizar={actualizar} />;
}

// ── Pantalla de inicio ──
function Inicio({ onEmpezar }: { onEmpezar: (e: Estado) => void }) {
  const [nombre, setNombre] = useState("");
  const [nacion, setNacion] = useState("es");
  const [posicion, setPosicion] = useState<Posicion>("DEL");
  const [liga, setLiga] = useState(LIGAS_INICIO[0]);
  const [club, setClub] = useState<number | null>(null);
  const clubes = CLUBES_CARRERA.filter((c) => c.escalon === 5 && c.liga === liga);

  return (
    <div className="mc panel">
      <h2 className="mc__h">Crea tu jugador</h2>
      <label className="mc__campo">
        <span>Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} placeholder="El Crack" />
      </label>

      <div className="mc__campo">
        <span>Nacionalidad</span>
        <div className="mc__banderas">
          {NACIONES.map((n) => (
            <button key={n.codigo} type="button" className={nacion === n.codigo ? "is-on" : ""} onClick={() => setNacion(n.codigo)} title={n.nombre}>
              {/* eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API */}
              <img src={bandera(n.codigo)} alt="" width={26} height={18} />
              <span>{n.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mc__campo">
        <span>Posición</span>
        <div className="jg-modos">
          {POSICIONES.map((p) => (
            <button key={p} type="button" className={posicion === p ? "is-on" : ""} onClick={() => setPosicion(p)}>
              {NOMBRE_POSICION[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="mc__campo">
        <span>Tu primer equipo (segunda división)</span>
        <div className="jg-modos">
          {LIGAS_INICIO.map((l) => (
            <button
              key={l}
              type="button"
              className={liga === l ? "is-on" : ""}
              onClick={() => {
                setLiga(l);
                setClub(null);
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mc__clubes">
          {clubes.map((c) => (
            <button key={c.id} type="button" className={club === c.id ? "is-on" : ""} onClick={() => setClub(c.id)}>
              <Escudo id={c.id} size={34} />
              <span>{c.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn--accent"
        disabled={club == null}
        onClick={() => club != null && onEmpezar(crearCarrera({ nombre, nacion, posicion, clubId: club, semilla: Math.floor(Math.random() * 1e9) }))}
      >
        {club == null ? "Elige tu equipo" : "Empezar mi carrera con 17 años →"}
      </button>
    </div>
  );
}

// ── La partida ──
function Partida({ e, actualizar }: { e: Estado; actualizar: (e: Estado | null) => void }) {
  const club = clubPorId(e.clubId)!;
  const nacion = nacionPorCodigo(e.nacion);
  const ultima = e.historial.at(-1);
  const [abandonar, setAbandonar] = useState(false);

  return (
    <div className="mc-juego">
      <div className="mc-ficha panel">
        <Escudo id={e.clubId} size={52} />
        <div className="mc-ficha__txt">
          <b>{e.nombre}</b>
          <span>
            {/* eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API */}
            <img src={bandera(e.nacion)} alt={nacion.nombre} width={18} height={12} /> {NOMBRE_POSICION[e.posicion]} · {e.fase === "fin" ? "Retirado" : `${e.edad} años`} · {club.nombre}
          </span>
          <span className="mc-ficha__esc">{NOMBRE_ESCALON[e.escalonClub as Escalon]}</span>
        </div>
        <div className="mc-ficha__media">
          <b>{e.media}</b>
          <span>media</span>
        </div>
      </div>

      {e.fase === "escenario" && e.escenario && (
        <div className="mc panel">
          <p className="mc__temp">
            Temporada {temporadaTexto(e.anio)} · {e.edad} años
          </p>
          <h2 className="mc__h">{e.escenario.titulo}</h2>
          <p>{e.escenario.texto}</p>
          <div className="mc__opciones">
            {e.escenario.opciones.map((o, i) => (
              <button key={i} type="button" onClick={() => actualizar(elegirOpcion(e, i))}>
                {o.texto}
              </button>
            ))}
          </div>
        </div>
      )}

      {e.fase === "resultado" && ultima && (
        <div className="mc panel">
          <p className="mc__temp">
            Temporada {temporadaTexto(ultima.anio)} · {ultima.edad} años
          </p>
          <p className="mc__eleccion">
            <b>{ultima.eleccion}.</b> {ultima.resultadoEleccion}
            {ultima.lesionado ? " Además, una lesión te tuvo un tiempo fuera." : ""}
          </p>
          {ultima.cedidoEn && (
            <p className="mc__eleccion">
              Jugaste cedido en <b>{clubPorId(ultima.cedidoEn)?.nombre}</b>.
            </p>
          )}
          <Estadisticas t={ultima} posicion={e.posicion} />
          <button type="button" className="btn btn--accent" onClick={() => actualizar(pasarAOfertas(e))}>
            {ultima.edad + 1 >= EDAD_RETIRO ? "Colgar las botas →" : "Ver el verano →"}
          </button>
        </div>
      )}

      {e.fase === "ofertas" && (
        <div className="mc panel">
          <p className="mc__temp">Verano {e.anio + 1} · vas a cumplir {e.edad + 1}</p>
          <h2 className="mc__h">{e.sinRenovar ? "El club no te renueva" : "¿Qué haces la próxima temporada?"}</h2>
          {e.sinRenovar && <p>Tu nivel ya no da para este club. Te llegan estas ofertas:</p>}
          <div className="mc__opciones">
            {!e.sinRenovar && (
              <button type="button" onClick={() => actualizar(decidir(e, { tipo: "seguir" }))}>
                <Escudo id={e.clubId} /> Seguir en {club.nombre}
              </button>
            )}
            {e.ofertas.map((id) => {
              const c = clubPorId(id)!;
              const flecha = c.escalon < e.escalonClub ? "⬆️ Un paso adelante" : c.escalon === e.escalonClub ? "↔️ Mismo nivel" : "⬇️ Un paso atrás";
              return (
                <button key={id} type="button" onClick={() => actualizar(decidir(e, { tipo: "fichar", clubId: id }))}>
                  <Escudo id={id} /> Fichar: {c.nombre}
                  <small>
                    {flecha} · {c.liga} · {NOMBRE_ESCALON[c.escalon]}
                  </small>
                </button>
              );
            })}
            {e.ofertas.length === 0 && !e.sinRenovar && <p className="mc__nota">Este verano no ha llamado nadie: toca demostrar más.</p>}
            {puedeRetirarse(e) && (
              <button type="button" className="mc__retiro" onClick={() => actualizar(decidir(e, { tipo: "retirarse" }))}>
                👋 Retirarme ahora{e.edad + 1 >= EDAD_RETIRO - 1 ? " (el año que viene será obligatorio)" : ""}
              </button>
            )}
          </div>
        </div>
      )}

      {e.fase === "fin" && <Final e={e} onNueva={() => actualizar(null)} />}

      {e.historial.length > 0 && <Historial e={e} />}

      {e.fase !== "fin" && (
        <p className="mc__nota">
          {abandonar ? (
            <>
              ¿Seguro? Se pierde esta carrera.{" "}
              <button type="button" className="mc__enlace" onClick={() => actualizar(null)}>
                Sí, empezar otra
              </button>{" "}
              ·{" "}
              <button type="button" className="mc__enlace" onClick={() => setAbandonar(false)}>
                No
              </button>
            </>
          ) : (
            <button type="button" className="mc__enlace" onClick={() => setAbandonar(true)}>
              Abandonar y empezar otra carrera
            </button>
          )}
        </p>
      )}
    </div>
  );
}

function Estadisticas({ t, posicion }: { t: Estado["historial"][number]; posicion: Posicion }) {
  const delta = t.media - t.mediaInicio;
  return (
    <>
      <div className="mc-stats">
        <div>
          <b>{t.partidos}</b>
          <span>partidos</span>
        </div>
        {posicion !== "POR" && (
          <div>
            <b>{t.goles}</b>
            <span>goles</span>
          </div>
        )}
        {posicion !== "POR" && (
          <div>
            <b>{t.asistencias}</b>
            <span>asistencias</span>
          </div>
        )}
        {(posicion === "POR" || posicion === "DEF") && (
          <div>
            <b>{t.porteriasCero}</b>
            <span>porterías a cero</span>
          </div>
        )}
        <div>
          <b>{t.nota ?? "—"}</b>
          <span>nota</span>
        </div>
        <div>
          <b className={delta > 0 ? "is-sube" : delta < 0 ? "is-baja" : ""}>
            {t.media} {delta !== 0 && <small>({delta > 0 ? `+${delta}` : delta})</small>}
          </b>
          <span>media</span>
        </div>
      </div>
      {t.seleccion && (
        <p className="mc__nota">
          Con la selección: {t.seleccion.partidos} partidos{posicion !== "POR" ? ` y ${t.seleccion.goles} goles` : ""}.
        </p>
      )}
      {(t.trofeos.length > 0 || t.premios.length > 0) && (
        <div className="mc-chips">
          {t.trofeos.map((x) => (
            <span key={x}>🏆 {x}</span>
          ))}
          {t.premios.map((x) => (
            <span key={x} className="is-premio">
              🥇 {x}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function Historial({ e }: { e: Estado }) {
  return (
    <div className="panel mc-hist">
      <h3>Tu carrera, año a año</h3>
      <div className="mc-hist__tabla">
        <table>
          <thead>
            <tr>
              <th>Temp.</th>
              <th>Edad</th>
              <th>Club</th>
              <th>Media</th>
              <th>PJ</th>
              {e.posicion !== "POR" && <th>G</th>}
              {e.posicion !== "POR" && <th>A</th>}
              {(e.posicion === "POR" || e.posicion === "DEF") && <th>PC</th>}
              <th>Nota</th>
              <th>Títulos</th>
            </tr>
          </thead>
          <tbody>
            {[...e.historial].reverse().map((t) => (
              <tr key={t.anio}>
                <td>{temporadaTexto(t.anio)}</td>
                <td>{t.edad}</td>
                <td className="mc-hist__club">
                  <Escudo id={t.cedidoEn ?? t.clubId} size={20} />
                  <span>
                    {clubPorId(t.cedidoEn ?? t.clubId)?.nombre}
                    {t.cedidoEn ? " (cedido)" : ""}
                  </span>
                </td>
                <td>{t.media}</td>
                <td>{t.partidos}</td>
                {e.posicion !== "POR" && <td>{t.goles}</td>}
                {e.posicion !== "POR" && <td>{t.asistencias}</td>}
                {(e.posicion === "POR" || e.posicion === "DEF") && <td>{t.porteriasCero}</td>}
                <td>{t.nota ?? "—"}</td>
                <td className="mc-hist__tit">{[...t.trofeos.map((x) => `🏆 ${x}`), ...t.premios.map((x) => `🥇 ${x}`)].join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Final({ e, onNueva }: { e: Estado; onNueva: () => void }) {
  const r = resumen(e);
  const [hecho, setHecho] = useState(false);
  const balones = r.premios.find((p) => p[0] === "Balón de Oro")?.[1] ?? 0;
  const texto =
    `${e.nombre} (${nacionPorCodigo(e.nacion).nombre}, ${NOMBRE_POSICION[e.posicion].toLowerCase()}): ${r.titulo}. ` +
    `${r.temporadas} temporadas, ${r.partidos} partidos, ${r.goles} goles, ${r.trofeos.reduce((s, t) => s + t[1], 0)} títulos` +
    `${balones ? ` y ${balones} Balón${balones > 1 ? "es" : ""} de Oro` : ""}. ¿Lo superas?`;
  const url = "https://www.soyreinaldo.com/juegos/modo-carrera";
  return (
    <div className="mc panel mc-final">
      <p className="mc__temp">Retirada · {e.edad + 1 >= EDAD_RETIRO ? EDAD_RETIRO : e.edad + 1} años</p>
      <h2 className="mc__h">{r.titulo}</h2>
      <p className="mc-final__legado">
        Legado: <b>{r.legado}</b> puntos · media máxima <b>{r.mediaMax}</b>
      </p>
      <div className="mc-stats">
        <div>
          <b>{r.partidos}</b>
          <span>partidos</span>
        </div>
        {e.posicion !== "POR" && (
          <div>
            <b>{r.goles}</b>
            <span>goles</span>
          </div>
        )}
        {e.posicion !== "POR" && (
          <div>
            <b>{r.asistencias}</b>
            <span>asistencias</span>
          </div>
        )}
        {(e.posicion === "POR" || e.posicion === "DEF") && (
          <div>
            <b>{r.porteriasCero}</b>
            <span>porterías a cero</span>
          </div>
        )}
        <div>
          <b>{r.internacional.partidos}</b>
          <span>con la selección</span>
        </div>
      </div>
      <div className="mc-final__clubes">
        {r.clubes.map((id) => (
          <span key={id} title={clubPorId(id)?.nombre}>
            <Escudo id={id} size={30} />
          </span>
        ))}
      </div>
      {(r.trofeos.length > 0 || r.premios.length > 0) && (
        <div className="mc-chips">
          {r.trofeos.map(([x, n]) => (
            <span key={x}>
              🏆 {x}
              {n > 1 ? ` ×${n}` : ""}
            </span>
          ))}
          {r.premios.map(([x, n]) => (
            <span key={x} className="is-premio">
              🥇 {x}
              {n > 1 ? ` ×${n}` : ""}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--accent"
          onClick={async () => {
            try {
              if (typeof navigator.share === "function") await navigator.share({ text: texto, url });
              else {
                await navigator.clipboard.writeText(`${texto} ${url}`);
                setHecho(true);
              }
            } catch {
              // Compartir cancelado.
            }
          }}
        >
          {hecho ? "✓ Copiado" : "Compartir mi carrera"}
        </button>
        <button type="button" className="btn" onClick={onNueva}>
          Nueva carrera
        </button>
      </div>
    </div>
  );
}
