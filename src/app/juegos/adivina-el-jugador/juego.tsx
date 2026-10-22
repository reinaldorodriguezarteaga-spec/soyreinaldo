"use client";

import { caraDe } from "@/lib/juegos/caras";
import { Fragment, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { MAX_INTENTOS, jugadorDelDia, pistasJugador, textoCompartirJugador } from "@/lib/juegos/adivina-jugador";
import { JUGADORES, clubId, clubNombre, type Jugador } from "@/lib/juegos/carreras";
import { normalizar } from "@/lib/juegos/diario";
import { NIVELES, puntosAdivinar, reloj, type Nivel } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import { useCronometro } from "@/components/juegos/useCronometro";

/**
 * «Adivina el jugador»: la carrera club a club y cinco intentos. Mismo
 * esquema que «Adivina el equipo»: reto del día guardado en el navegador
 * (con racha) y práctica sin límite.
 */

const CLAVE = "jg-jugador-v1";
type Dia = { ids: string[]; ok: boolean; nivel?: Nivel; inicio?: number; fin?: number };
type Guardado = { dias: Record<number, Dia> };

const escudo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;
const bandera = (pais: string) => `https://media.api-sports.io/flags/${pais}.svg`;
const sinSuscripcion = () => () => {};
const ORDENADOS = [...JUGADORES].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

function leer(): Guardado {
  try {
    const raw = localStorage.getItem(CLAVE);
    const g = raw ? (JSON.parse(raw) as Guardado) : null;
    return g && typeof g.dias === "object" ? g : { dias: {} };
  } catch {
    return { dias: {} };
  }
}

function guardar(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g));
  } catch {
    // Storage bloqueado: se juega igual, sin recordar el resultado.
  }
}

function racha(g: Guardado, hoy: number): number {
  let n = 0;
  let d = g.dias[hoy] ? hoy : hoy - 1;
  while (g.dias[d]?.ok) {
    n++;
    d--;
  }
  return n;
}

export default function Juego({ numero }: { numero: number }) {
  const [modo, setModo] = useState<"dia" | "practica">("dia");
  const [practica, setPractica] = useState<Jugador | null>(null);
  const [vistos, setVistos] = useState<string[]>([]);
  const [intentos, setIntentos] = useState<string[]>([]);
  const [guardado, setGuardado] = useState<Guardado>({ dias: {} });
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  const delDia = useMemo(() => jugadorDelDia(numero), [numero]);
  const reto = modo === "dia" ? delDia : (practica ?? delDia);

  useEffect(() => {
    const g = leer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setGuardado(g);
    const d = g.dias[numero];
    if (d) {
      setIntentos(d.ids);
      setNivel(d.nivel ?? null);
      setInicio(d.inicio ?? null);
      setFin(d.fin ?? null);
    }
  }, [numero]);

  const restante = useCronometro(NIVELES[nivel ?? "facil"].segundos, inicio, fin);
  const agotado = inicio != null && fin == null && restante === 0;
  const acertado = intentos.includes(reto.id);
  const terminado = acertado || intentos.length >= MAX_INTENTOS || fin != null || agotado;
  const fallos = intentos.filter((id) => id !== reto.id).length;
  const pistas = pistasJugador(reto, terminado ? 4 : fallos);

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    if (q.length < 2) return [];
    return ORDENADOS.filter((j) => !intentos.includes(j.id) && normalizar(j.nombre).includes(q)).slice(0, 8);
  }, [busca, intentos]);

  function apuntar(parcial: Partial<Dia>) {
    if (modo !== "dia") return;
    const previo = guardado.dias[numero] ?? { ids: [], ok: false };
    const g: Guardado = { dias: { ...guardado.dias, [numero]: { ...previo, ...parcial } } };
    setGuardado(g);
    guardar(g);
  }

  // Se acabó el tiempo: la partida se cierra una sola vez.
  useEffect(() => {
    if (!agotado) return;
    const ahora = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- respuesta al reloj (externo), una sola vez
    setFin(ahora);
    apuntar({ fin: ahora });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al agotarse
  }, [agotado]);

  function empezar(n: Nivel) {
    const ahora = Date.now();
    setNivel(n);
    setInicio(ahora);
    setFin(null);
    apuntar({ nivel: n, inicio: ahora });
  }

  function intentar(id: string) {
    if (terminado || intentos.includes(id)) return;
    const nuevos = [...intentos, id];
    setIntentos(nuevos);
    setBusca("");
    const acaba = nuevos.includes(reto.id) || nuevos.length >= MAX_INTENTOS;
    const ahora = Date.now();
    if (acaba) setFin(ahora);
    apuntar({ ids: nuevos, ok: nuevos.includes(reto.id), ...(acaba ? { fin: ahora } : {}) });
  }

  function nuevoReto() {
    let libres = JUGADORES.filter((j) => !vistos.includes(j.id));
    const reinicio = libres.length === 0;
    if (reinicio) libres = JUGADORES;
    const r = libres[Math.floor(Math.random() * libres.length)];
    setVistos((v) => (reinicio ? [r.id] : [...v, r.id]));
    setPractica(r);
    setIntentos([]);
    setBusca("");
    setCopiado(false);
    setInicio(nivel ? Date.now() : null);
    setFin(null);
  }

  function irA(m: "dia" | "practica") {
    if (m === modo) return;
    setModo(m);
    setCopiado(false);
    setBusca("");
    if (m === "dia") {
      const d = guardado.dias[numero];
      setIntentos(d?.ids ?? []);
      setNivel(d?.nivel ?? null);
      setInicio(d?.inicio ?? null);
      setFin(d?.fin ?? null);
    } else nuevoReto();
  }

  const puntos = nivel ? puntosAdivinar({ acertado, fallos, sobra: restante, nivel }) : 0;
  const cuadros = intentos.map((id) => id === reto.id ? "🟩" : "🟥").join("");
  const texto = textoCompartirJugador({ numero: modo === "dia" ? numero : null, acertado, intentos: intentos.length });
  // Solo cuentan los días terminados: aciertos, cinco intentos o tiempo agotado.
  const cerrados = Object.values(guardado.dias).filter((d) => d.ok || d.ids.length >= MAX_INTENTOS || d.fin != null);
  const jugados = cerrados.length;
  const ganados = cerrados.filter((d) => d.ok).length;
  const nombreDe = (id: string) => JUGADORES.find((j) => j.id === id)?.nombre ?? "—";

  return (
    <div className="jg">
      <div className="jg-modos" role="tablist">
        <button type="button" role="tab" aria-selected={modo === "dia"} className={modo === "dia" ? "is-on" : ""} onClick={() => irA("dia")}>
          Reto del día #{numero}
        </button>
        <button type="button" role="tab" aria-selected={modo === "practica"} className={modo === "practica" ? "is-on" : ""} onClick={() => irA("practica")}>
          Práctica
        </button>
      </div>

      {!nivel && !terminado ? (
        <ElegirNivel onElegir={empezar} />
      ) : (
        <>
          <ol className="jg-carrera" aria-label="Carrera del jugador">
            {reto.carrera.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <li className="jg-carrera__flecha" aria-hidden>
                    →
                  </li>
                )}
                <li className="jg-club">
                  {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
                  <img src={escudo(clubId(c))} alt="" width={48} height={48} loading="lazy" />
                  <span>{clubNombre(c)}</span>
                </li>
              </Fragment>
            ))}
          </ol>

          <div className="jg-panel jg-panel--ancho">
            <div className="jg-puntos" aria-label={`Intento ${Math.min(intentos.length + 1, MAX_INTENTOS)} de ${MAX_INTENTOS}`}>
              {Array.from({ length: MAX_INTENTOS }, (_, i) => {
                const id = intentos[i];
                const cls = id == null ? "" : id === reto.id ? "is-ok" : "is-mal";
                return <span key={i} className={`jg-punto ${cls}`} />;
              })}
            </div>

              {nivel && !terminado && (
                <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
                  ⏱ {reloj(restante)} · {NIVELES[nivel].nombre}
                </span>
              )}

            {terminado ? (
              <div className={`jg-final ${acertado ? "is-ok" : "is-mal"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API */}
                <img src={caraDe(reto.id) ?? bandera(reto.pais)} alt="" width={56} height={56} className="jg-final__bandera" />
                <div>
                  <p className="jg-final__tit">{acertado ? `¡Acertaste en ${intentos.length}!` : "¡Casi!"}</p>
                  <p className="jg-final__eq">{reto.nombre}</p>
                  {!acertado && inicio != null && restante === 0 && <p className="jg-final__ctx">⏱ Se acabó el tiempo.</p>}
                </div>
              </div>
            ) : (
              <div className="jg-busca">
                <label htmlFor="jg-qj" className="jg-busca__lab">
                  ¿Quién es? Intento {intentos.length + 1} de {MAX_INTENTOS}
                </label>
                <input
                  id="jg-qj"
                  type="search"
                  autoComplete="off"
                  placeholder="Escribe al menos dos letras…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filtrados.length === 1) intentar(filtrados[0].id);
                  }}
                />
                {busca.trim().length >= 2 && (
                  <ul className="jg-opciones">
                    {filtrados.map((j) => (
                      <li key={j.id}>
                        <button type="button" onClick={() => intentar(j.id)}>
                          {j.nombre}
                        </button>
                      </li>
                    ))}
                    {filtrados.length === 0 && <li className="jg-opciones__vacio">No está en nuestra lista</li>}
                  </ul>
                )}
              </div>
            )}

            {fallos > 0 && (
              <ul className="jg-fallos">
                {intentos
                  .filter((id) => id !== reto.id)
                  .map((id) => (
                    <li key={id}>✗ {nombreDe(id)}</li>
                  ))}
              </ul>
            )}

            {pistas.length > 0 && (
              <ul className="jg-pistas">
                {pistas.map((p) => (
                  <li key={p.titulo}>
                    <b>{p.titulo}</b>{" "}
                    {p.bandera ? (
                      // eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API
                      <img src={bandera(p.bandera)} alt={p.bandera} width={28} height={20} className="jg-pistas__bandera" />
                    ) : (
                      p.texto
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!terminado && fallos === 0 && (
              <p className="pz-ayuda" style={{ margin: 0 }}>
                Cada fallo desbloquea una pista: posición, país, año de nacimiento e iniciales.
              </p>
            )}

            {terminado && nivel && (
              <CierreJuego juego="jugador" dia={modo === "dia" ? numero : null} nivel={nivel} puntos={puntos} resultado={`${cuadros} ${acertado ? intentos.length : "X"}/${MAX_INTENTOS}`} />
            )}
            {terminado && (
              <div className="jg-acciones">
                {nativo ? (
                  <button type="button" className="btn btn--accent" onClick={() => navigator.share({ text: texto }).catch(() => {})}>
                    Compartir resultado
                  </button>
                ) : (
                  <a className="btn btn--accent" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
                    Compartir por WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(texto)
                      .then(() => setCopiado(true))
                      .catch(() => {})
                  }
                >
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                {modo === "practica" ? (
                  <button type="button" className="btn btn--ghost" onClick={nuevoReto}>
                    Otro jugador →
                  </button>
                ) : (
                  <button type="button" className="btn btn--ghost" onClick={() => irA("practica")}>
                    Seguir en práctica →
                  </button>
                )}
              </div>
            )}

            {modo === "dia" && jugados > 0 && (
              <div className="jg-stats">
                <div>
                  <b>{jugados}</b>
                  <span>Jugados</span>
                </div>
                <div>
                  <b>{Math.round((ganados / jugados) * 100)}%</b>
                  <span>Aciertos</span>
                </div>
                <div>
                  <b>{racha(guardado, numero)}</b>
                  <span>Racha</span>
                </div>
              </div>
            )}
            {modo === "dia" && terminado && <p className="pz-ayuda">Mañana, un jugador nuevo.</p>}
          </div>
        </>
      )}
    </div>
  );
}
