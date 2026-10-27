"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  LIGAS_INICIO,
  clubesDeInicio,
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
  TEXTO_RONDA,
  crearCarrera,
  puedeRetirarse,
  resumen,
  temporadaTexto,
  type Estado,
  type Posicion,
} from "@/lib/juegos/carrera/motor";
import { aplicar, type Accion, type Inicio as InicioCarrera } from "@/lib/juegos/carrera/replay";
import { guardarCarrera, type FilaTop } from "./acciones";
import { fotoTrofeo, tipoTrofeo } from "@/lib/juegos/carrera/trofeos";

type Modo = "rapida" | "extendida";
type Tabla = Modo | "mundiales" | "balones";
export type Tops = Record<Tabla, FilaTop[]>;

/**
 * Modo carrera (27-oct, pedido del dueño). Juego rápido: la partida no se
 * guarda (si recargas, empiezas otra). Cada decisión se apunta y, al
 * retirarte, el servidor rejuega la carrera para el ranking (top 10).
 */

const bandera = (c: string) => `https://media.api-sports.io/flags/${c}.svg`;
const POSICIONES: Posicion[] = ["POR", "DEF", "MED", "DEL"];

type Partida = { inicio: InicioCarrera; acciones: Accion[]; e: Estado };

function Escudo({ id, size = 28 }: { id: number; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API
  return <img src={escudoClub(id)} alt="" width={size} height={size} style={{ objectFit: "contain" }} />;
}

export default function ModoCarrera({ conSesion, topsIniciales }: { conSesion: boolean; topsIniciales: Tops }) {
  const [partida, setPartida] = useState<Partida | null>(null);
  const [tops, setTops] = useState<Tops>(topsIniciales);

  // A media carrera, avisar antes de salir: no se guarda.
  const enJuego = !!partida && partida.e.fase !== "fin" && partida.e.historial.length > 0;
  useEffect(() => {
    if (!enJuego) return;
    const aviso = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [enJuego]);

  const hacer = (a: Accion) =>
    setPartida((p) => {
      if (!p) return p;
      const e = aplicar(p.e, a);
      return e === p.e ? p : { ...p, e, acciones: [...p.acciones, a] };
    });

  return (
    <>
      {partida ? (
        <PartidaVista
          p={partida}
          hacer={hacer}
          conSesion={conSesion}
          onNueva={() => setPartida(null)}
          onTop={(modo, t, otros) => setTops((x) => ({ ...x, [modo]: t, ...otros }))}
        />
      ) : (
        <Inicio conSesion={conSesion} onEmpezar={(inicio) => setPartida({ inicio, acciones: [], e: crearCarrera(inicio) })} />
      )}
      <Ranking tops={tops} inicial={partida?.inicio.extendido ? "extendida" : "rapida"} />
    </>
  );
}

// ── Pantalla de inicio ──
function Inicio({ conSesion, onEmpezar }: { conSesion: boolean; onEmpezar: (i: InicioCarrera) => void }) {
  const [nombre, setNombre] = useState("");
  const [nacion, setNacion] = useState("es");
  const [posicion, setPosicion] = useState<Posicion>("DEL");
  const [liga, setLiga] = useState(LIGAS_INICIO[0]);
  const [extendido, setExtendido] = useState(false);
  const [club, setClub] = useState<number | null>(null);
  const clubes = clubesDeInicio(liga);

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
        <span>¿Cómo quieres jugar?</span>
        <div className="mc__version">
          <button type="button" className={!extendido ? "is-on" : ""} onClick={() => setExtendido(false)}>
            <b>⚡ Rápida</b>
            <small>Una decisión por temporada. Unos 5 minutos.</small>
          </button>
          <button type="button" className={extendido ? "is-on" : ""} onClick={() => setExtendido(true)}>
            <b>🧠 Extendida</b>
            <small>También decides a mitad de temporada. Unos 10 minutos.</small>
          </button>
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
        <span>Tu primer equipo</span>
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
        {liga === "Canteras" && <p className="mc__nota">Nivel de segunda; si destacas, puedes subir al primer equipo.</p>}
        {liga === "Primera (modestos)" && <p className="mc__nota">Más nivel, pero con 17 años te costará jugar: quizá toque salir cedido.</p>}
        <div className="mc__clubes">
          {clubes.map((c) => (
            <button key={c.id} type="button" title={c.nombre} className={club === c.id ? "is-on" : ""} onClick={() => setClub(c.id)}>
              <Escudo id={c.id} size={34} />
              <span>{c.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {!conSesion && (
        <p className="mc__nota">
          <Link href="/login?redirect=/juegos/modo-carrera">Entra</Link> antes de empezar si quieres que tu carrera cuente para el ranking.
        </p>
      )}
      <button
        type="button"
        className="btn btn--accent"
        disabled={club == null}
        onClick={() => club != null && onEmpezar({ nombre, nacion, posicion, clubId: club, semilla: Math.floor(Math.random() * 1e9), extendido })}
      >
        {club == null ? "Elige tu equipo" : "Empezar mi carrera con 17 años →"}
      </button>
    </div>
  );
}

// ── La partida ──
function PartidaVista({
  p,
  hacer,
  conSesion,
  onNueva,
  onTop,
}: {
  p: Partida;
  hacer: (a: Accion) => void;
  conSesion: boolean;
  onNueva: () => void;
  onTop: (modo: Modo, t: FilaTop[], otros: { mundiales: FilaTop[]; balones: FilaTop[] }) => void;
}) {
  const e = p.e;
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
            {e.cesion && e.fase !== "fin" && e.fase !== "ofertas" ? ` (cedido en ${clubPorId(e.cesion)?.nombre})` : ""}
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
            {e.extendido ? (e.escenario.mitad ? " · Mitad de temporada" : " · Pretemporada") : ""}
          </p>
          {e.escenario.mitad && e.pendiente && (
            <>
              <p className="mc__nota">
                En pretemporada: <b>{e.pendiente.eleccion}.</b> {e.pendiente.resultado}
              </p>
              <div className="mc-ida">
                <p className="mc__temp">
                  Tu primera vuelta
                  {e.pendiente.cedidoEn ? ` · cedido en ${clubPorId(e.pendiente.cedidoEn)?.nombre}` : ""}
                  {e.pendiente.primeraMitad.lesionado ? " · con una lesión por medio" : ""}
                </p>
                <div className="mc-stats">
                  <div>
                    <b>{e.pendiente.primeraMitad.partidos}</b>
                    <span>partidos</span>
                  </div>
                  {e.posicion !== "POR" && (
                    <div>
                      <b>{e.pendiente.primeraMitad.goles}</b>
                      <span>goles</span>
                    </div>
                  )}
                  {e.posicion !== "POR" && (
                    <div>
                      <b>{e.pendiente.primeraMitad.asistencias}</b>
                      <span>asistencias</span>
                    </div>
                  )}
                  {(e.posicion === "POR" || e.posicion === "DEF") && (
                    <div>
                      <b>{e.pendiente.primeraMitad.porteriasCero}</b>
                      <span>porterías a cero</span>
                    </div>
                  )}
                  <div>
                    <b>{e.pendiente.primeraMitad.nota ?? "—"}</b>
                    <span>nota</span>
                  </div>
                  <div>
                    <b>{e.pendiente.primeraMitad.media}</b>
                    <span>media</span>
                  </div>
                </div>
              </div>
            </>
          )}
          <h2 className="mc__h">{e.escenario.titulo}</h2>
          <p>{e.escenario.texto}</p>
          <div className="mc__opciones">
            {e.escenario.opciones.map((o, i) => (
              <button key={i} type="button" onClick={() => hacer({ t: "opcion", i })}>
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
          {ultima.invierno && (
            <p className="mc__eleccion">
              A mitad de temporada: <b>{ultima.invierno.eleccion}.</b> {ultima.invierno.resultado}
            </p>
          )}
          {ultima.cedidoEn && (
            <p className="mc__eleccion">
              Jugaste cedido en <b>{clubPorId(ultima.cedidoEn)?.nombre}</b>.
            </p>
          )}
          <Estadisticas t={ultima} posicion={e.posicion} />
          <button type="button" className="btn btn--accent" onClick={() => hacer({ t: "ver" })}>
            {ultima.edad + 1 >= EDAD_RETIRO ? "Colgar las botas →" : "Ver el verano →"}
          </button>
        </div>
      )}

      {e.fase === "ofertas" && (
        <div className="mc panel">
          <p className="mc__temp">Verano {e.anio + 1} · vas a cumplir {e.edad + 1}</p>
          <h2 className="mc__h">
            {e.finFilial ? "Se acabó el filial" : e.sinRenovar ? "El club no te renueva" : "¿Qué haces la próxima temporada?"}
          </h2>
          {e.finFilial ? (
            <p>Con {e.edad + 1} años ya no tienes sitio en el filial: toca dar el salto. Te llegan estas ofertas:</p>
          ) : (
            e.sinRenovar && <p>Tu nivel ya no da para este club. Te llegan estas ofertas:</p>
          )}
          <div className="mc__opciones">
            {!e.sinRenovar && (
              <button type="button" onClick={() => hacer({ t: "seguir" })}>
                <Escudo id={e.clubId} /> Seguir en {club.nombre}
              </button>
            )}
            {e.ofertas.map((id) => {
              const c = clubPorId(id)!;
              const primerEquipo = clubPorId(e.clubId)?.matriz === id;
              const flecha = primerEquipo
                ? "⬆️ Subir al primer equipo"
                : c.escalon < e.escalonClub
                  ? "⬆️ Un paso adelante"
                  : c.escalon === e.escalonClub
                    ? "↔️ Mismo nivel"
                    : "⬇️ Un paso atrás";
              return (
                <button key={id} type="button" onClick={() => hacer({ t: "fichar", id })}>
                  <Escudo id={id} /> Fichar: {c.nombre}
                  <small>
                    {flecha} · {c.liga} · {NOMBRE_ESCALON[c.escalon]}
                  </small>
                </button>
              );
            })}
            {(e.cesiones ?? []).map((id) => {
              const c = clubPorId(id)!;
              return (
                <button key={`cesion-${id}`} type="button" onClick={() => hacer({ t: "ceder", id })}>
                  <Escudo id={id} /> Cedido una temporada: {c.nombre}
                  <small>
                    🔁 Juegas allí un año y vuelves a {club.nombre} · {c.liga} · {NOMBRE_ESCALON[c.escalon]}
                  </small>
                </button>
              );
            })}
            {e.ofertas.length === 0 && !e.sinRenovar && !(e.cesiones ?? []).length && (
              <p className="mc__nota">Este verano no ha llamado nadie: toca demostrar más.</p>
            )}
            {puedeRetirarse(e) && (
              <button type="button" className="mc__retiro" onClick={() => hacer({ t: "retiro" })}>
                👋 Retirarme ahora{e.edad + 1 >= EDAD_RETIRO - 1 ? " (el año que viene será obligatorio)" : ""}
              </button>
            )}
          </div>
        </div>
      )}

      {e.fase === "fin" && <Final p={p} conSesion={conSesion} onNueva={onNueva} onTop={onTop} />}

      {e.historial.length > 0 && <Historial e={e} />}

      {e.fase !== "fin" && (
        <p className="mc__nota">
          {abandonar ? (
            <>
              ¿Seguro? Se pierde esta carrera.{" "}
              <button type="button" className="mc__enlace" onClick={onNueva}>
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
          {t.seleccion.torneo && (
            <>
              {" "}
              <b>
                {t.seleccion.torneo.nombre}: {TEXTO_RONDA[t.seleccion.torneo.ronda]}
              </b>
              {t.seleccion.torneo.partidos > 0 && posicion !== "POR" ? ` (${t.seleccion.torneo.goles} ${t.seleccion.torneo.goles === 1 ? "gol" : "goles"})` : ""}.
            </>
          )}
        </p>
      )}
      {(t.trofeos.length > 0 || t.premios.length > 0 || t.balonPuesto) && (
        <div className="mc-chips">
          {t.balonPuesto && t.balonPuesto > 1 && <span className="is-balon">🗳️ Balón de Oro: {t.balonPuesto}.º</span>}
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
                <td className="mc-hist__tit">
                  {[
                    ...t.trofeos.map((x) => `🏆 ${x}`),
                    ...t.premios.map((x) => `🥇 ${x}`),
                    ...(t.balonPuesto && t.balonPuesto > 1 ? [`🗳️ ${t.balonPuesto}.º Balón de Oro`] : []),
                  ].join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Final({ p, conSesion, onNueva, onTop }: { p: Partida; conSesion: boolean; onNueva: () => void; onTop: (modo: Modo, t: FilaTop[], otros: { mundiales: FilaTop[]; balones: FilaTop[] }) => void }) {
  const e = p.e;
  const r = resumen(e);
  const [hecho, setHecho] = useState(false);
  const [ranking, setRanking] = useState<string | null>(conSesion ? "Apuntando tu carrera en el ranking…" : null);
  const enviada = useRef(false);

  // Al retirarte, al ranking (el servidor la rejuega y calcula el legado).
  useEffect(() => {
    if (!conSesion || enviada.current) return;
    enviada.current = true;
    guardarCarrera(p.inicio, p.acciones)
      .then((res) => {
        if (!res.ok) {
          setRanking(res.error === "limite" ? "Hoy ya has metido muchas carreras: vuelve mañana." : "No se pudo apuntar en el ranking.");
          return;
        }
        onTop(res.modo, res.top, { mundiales: res.topMundiales, balones: res.topBalones });
        const decimo = res.top[9]?.legado;
        const mundiales =
          res.mundiales > 0
            ? res.puestoMundiales
              ? ` 🌍 Y con ${res.mundiales} Mundial${res.mundiales > 1 ? "es" : ""}, puesto ${res.puestoMundiales} en el ranking de Mundiales.`
              : ` 🌍 Tus ${res.mundiales} Mundial${res.mundiales > 1 ? "es" : ""} no llegan al top de Mundiales.`
            : "";
        const balones =
          res.balones > 0
            ? res.puestoBalones
              ? ` 🥇 Con ${res.balones} Balón${res.balones > 1 ? "es" : ""} de Oro, puesto ${res.puestoBalones} en el ranking de Balones de Oro.`
              : ` 🥇 Tus ${res.balones} Balón${res.balones > 1 ? "es" : ""} de Oro no llegan al top de Balones.`
            : "";
        setRanking(
          (res.puesto
            ? `🏆 ¡Entras en el top 10! Puesto ${res.puesto} con ${res.legado} puntos de legado.`
            : decimo != null
              ? `Te quedas fuera del top 10: el 10.º tiene ${decimo} puntos de legado y tú ${res.legado}.`
              : `Apuntada en el ranking con ${res.legado} puntos de legado.`) + mundiales + balones,
        );
      })
      .catch(() => setRanking("No se pudo apuntar en el ranking."));
  }, [conSesion, p, onTop]);
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
        {r.mejorBalon != null && (
          <>
            {" "}
            · mejor puesto en el Balón de Oro: <b>{r.mejorBalon}.º</b>
          </>
        )}
      </p>
      {ranking ? (
        <p className="mc-final__ranking">{ranking}</p>
      ) : (
        <p className="mc__nota">Sin sesión, las carreras no cuentan para el ranking.</p>
      )}
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
      <Palmares trofeos={r.trofeos} premios={r.premios} />
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

/** Rankings por un solo número (Mundiales, Balones de Oro): las dos versiones juntas. */
const ESPECIALES: Record<"mundiales" | "balones", { titulo: string; nota: string; vacio: string; valor: (f: FilaTop) => number; unidad: (n: number) => string }> = {
  mundiales: {
    titulo: "🌍 Top 10 de Mundiales ganados",
    nota: "Las carreras con más Mundiales, de las dos versiones. A igualdad, manda el legado.",
    vacio: "Nadie ha ganado aún un Mundial. ¿Serás el primero?",
    valor: (f) => f.mundiales,
    unidad: (n) => (n > 1 ? "Mundiales" : "Mundial"),
  },
  balones: {
    titulo: "🥇 Top 10 de Balones de Oro",
    nota: "Las carreras con más Balones de Oro, de las dos versiones. A igualdad, manda el legado.",
    vacio: "Nadie ha ganado aún un Balón de Oro. ¿Serás el primero?",
    valor: (f) => f.balones,
    unidad: (n) => (n > 1 ? "Balones de Oro" : "Balón de Oro"),
  },
};

const PESTANAS: [Tabla, string][] = [
  ["rapida", "⚡ Rápida"],
  ["extendida", "🧠 Extendida"],
  ["mundiales", "🌍 Mundiales"],
  ["balones", "🥇 Balones de Oro"],
];

function Ranking({ tops, inicial }: { tops: Tops; inicial: Modo }) {
  const [elegido, setElegido] = useState<Tabla | null>(null);
  const tabla = elegido ?? inicial;
  const top = tops[tabla];
  const especial = tabla === "mundiales" || tabla === "balones" ? ESPECIALES[tabla] : null;
  return (
    <div className="panel mc-hist mc-top">
      <h3>{especial ? especial.titulo : "🏆 Top 10 de carreras"}</h3>
      <div className="jg-modos" role="tablist">
        {PESTANAS.map(([t, texto]) => (
          <button key={t} type="button" className={tabla === t ? "is-on" : ""} onClick={() => setElegido(t)}>
            {texto}
          </button>
        ))}
      </div>
      {especial && <p className="mc__nota">{especial.nota}</p>}
      {top.length === 0 ? (
        <p className="mc__nota">{especial ? especial.vacio : "Aún no hay carreras en el ranking. ¡Estrénalo!"}</p>
      ) : (
        <ol>
          {top.map((f, i) => (
            <li key={`${f.user_id}-${i}`}>
              <span className="mc-top__pos">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              <span className="mc-top__quien">
                <b>{f.usuario}</b>
                <small>
                  {/* eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API */}
                  <img src={bandera(f.nacion)} alt="" width={16} height={11} /> {f.jugador} · {NOMBRE_POSICION[f.posicion as Posicion]} · {f.titulo}
                </small>
                <small>
                  {f.goles} goles · {f.titulos} títulos
                  {tabla !== "balones" && f.balones ? ` · ${f.balones} Balón${f.balones > 1 ? "es" : ""} de Oro` : ""}
                  {tabla !== "mundiales" && f.mundiales ? ` · ${f.mundiales} Mundial${f.mundiales > 1 ? "es" : ""}` : ""}
                  {especial ? ` · ${f.legado} de legado · ${f.modo === "extendida" ? "extendida" : "rápida"}` : ""}
                </small>
              </span>
              <span className="mc-top__legado">
                <b>{especial ? especial.valor(f) : f.legado}</b>
                <small>{especial ? especial.unidad(especial.valor(f)) : "legado"}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Palmarés con fotos reales de los trofeos (Wikimedia Commons, 28-oct). */
function Palmares({ trofeos, premios }: { trofeos: [string, number][]; premios: [string, number][] }) {
  const items = [
    ...trofeos.map(([nombre, n]) => ({ nombre, n, tipo: tipoTrofeo(nombre, false) })),
    ...premios.map(([nombre, n]) => ({ nombre, n, tipo: tipoTrofeo(nombre, true) })),
  ];
  if (items.length === 0) return <p className="mc__nota">Ni un título. El fútbol a veces es injusto.</p>;
  const grupos: { tipo: "club" | "seleccion" | "individual"; titulo: string }[] = [
    { tipo: "club", titulo: "Con tus clubes" },
    { tipo: "seleccion", titulo: "Con la selección" },
    { tipo: "individual", titulo: "Premios individuales" },
  ];
  const usadas = new Map<string, NonNullable<ReturnType<typeof fotoTrofeo>>>();
  return (
    <div className="mc-palmares">
      <h3>Palmarés</h3>
      {grupos.map((g) => {
        const lista = items.filter((x) => x.tipo === g.tipo);
        if (lista.length === 0) return null;
        return (
          <div key={g.tipo}>
            <p className="mc__temp">{g.titulo}</p>
            <div className="mc-palmares__grid">
              {lista.map((x) => {
                const foto = fotoTrofeo(x.nombre);
                if (foto) usadas.set(foto.pagina, foto);
                return (
                  <figure key={x.nombre} className="mc-trofeo">
                    {foto ? (
                      <a href={foto.pagina} target="_blank" rel="noopener noreferrer" title={`Foto: ${foto.autor} · ${foto.licencia}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- foto de Wikimedia Commons */}
                        <img src={foto.foto} alt={x.nombre} loading="lazy" />
                      </a>
                    ) : (
                      <span className="mc-trofeo__icono" aria-hidden>
                        {g.tipo === "individual" ? "🥇" : "🏆"}
                      </span>
                    )}
                    {x.n > 1 && <span className="mc-trofeo__n">×{x.n}</span>}
                    <figcaption>{x.nombre}</figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        );
      })}
      {usadas.size > 0 && (
        <details className="mc-palmares__creditos">
          <summary>Fotos: Wikimedia Commons</summary>
          <ul>
            {[...usadas.values()].map((f) => (
              <li key={f.pagina}>
                <a href={f.pagina} target="_blank" rel="noopener noreferrer">
                  {f.autor || "Autor desconocido"}
                </a>{" "}
                · {f.licencia}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
