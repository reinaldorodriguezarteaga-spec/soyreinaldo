"use client";
import { Timer } from "lucide-react";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { LIGAS_AHORCADO, MAX_FALLOS, PARTES, TECLADO, letraBase, letrasDe, type PartidaAhorcado } from "@/lib/juegos/ahorcado-comun";
import { NIVELES, puntosAdivinar, reloj, type Nivel } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import { useCronometro } from "@/components/juegos/useCronometro";
import { otroAhorcado } from "./acciones";

/**
 * «Ahorcado»: el nombre de un futbolista en huecos y la liga en la que juega.
 * Se piden letras (teclado en pantalla o el físico); cada fallo añade una
 * parte del muñeco: cabeza, dos piernas y dos brazos. Al quinto, ahorcado.
 * Reto del día (al ranking) y práctica por ligas. El inicio queda guardado:
 * recargar no reinicia el reloj.
 */

const CLAVE = "jg-ahorcado-v1";
type Dia = { letras: string[]; nivel?: Nivel; inicio?: number; fin?: number; ok?: boolean };
type Guardado = { dias: Record<number, Dia> };

const escudo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;
const logoLiga = (id: number) => `https://media.api-sports.io/football/leagues/${id}.png`;
const foto = (id: number) => `https://media.api-sports.io/football/players/${id}.png`;
const sinSuscripcion = () => () => {};

function leer(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as Guardado | null;
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

/** El patíbulo ya está desde el principio; cada fallo añade una parte. */
function Muneco({ fallos, ahorcado }: { fallos: number; ahorcado: boolean }) {
  return (
    <svg viewBox="0 0 200 220" className={`ah-dibujo${ahorcado ? " is-ahorcado" : ""}`} role="img" aria-label={`${fallos} de ${MAX_FALLOS} fallos`}>
      {/* Patíbulo: base, poste, travesaño, refuerzo y cuerda. */}
      <g className="ah-palo">
        <line x1="20" y1="210" x2="120" y2="210" />
        <line x1="50" y1="210" x2="50" y2="15" />
        <line x1="50" y1="15" x2="140" y2="15" />
        <line x1="50" y1="45" x2="80" y2="15" />
        <line x1="140" y1="15" x2="140" y2="40" />
      </g>
      <g className="ah-cuerpo">
        {fallos >= 1 && (
          <g className="ah-parte">
            <circle cx="140" cy="57" r="17" />
            <line x1="140" y1="74" x2="140" y2="135" />
            {ahorcado ? (
              <g className="ah-cara">
                <path d="M131 51 l6 6 M137 51 l-6 6 M143 51 l6 6 M149 51 l-6 6" />
                <path d="M132 66 q8 -5 16 0" />
              </g>
            ) : (
              <g className="ah-cara">
                <circle cx="134" cy="54" r="1.8" />
                <circle cx="146" cy="54" r="1.8" />
              </g>
            )}
          </g>
        )}
        {fallos >= 2 && <line className="ah-parte" x1="140" y1="135" x2="118" y2="178" />}
        {fallos >= 3 && <line className="ah-parte" x1="140" y1="135" x2="162" y2="178" />}
        {fallos >= 4 && <line className="ah-parte" x1="140" y1="92" x2="114" y2="118" />}
        {fallos >= 5 && <line className="ah-parte" x1="140" y1="92" x2="166" y2="118" />}
      </g>
    </svg>
  );
}

export default function Juego({ numero, delDia }: { numero: number; delDia: PartidaAhorcado }) {
  const [modo, setModo] = useState<"dia" | "practica">("dia");
  const [practica, setPractica] = useState<PartidaAhorcado | null>(null);
  const [vistos, setVistos] = useState<number[]>([]);
  const [liga, setLiga] = useState<number | null>(null);
  const [letras, setLetras] = useState<string[]>([]);
  const [guardado, setGuardado] = useState<Guardado>({ dias: {} });
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cargando, startTransition] = useTransition();
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  const partida = modo === "dia" ? delDia : (practica ?? delDia);
  const objetivo = useMemo(() => letrasDe(partida.palabra), [partida.palabra]);

  // El reto de hoy, si ya se empezó en este navegador.
  useEffect(() => {
    const g = leer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setGuardado(g);
    const d = g.dias[numero];
    if (d) {
      setLetras(d.letras ?? []);
      setNivel(d.nivel ?? null);
      setInicio(d.inicio ?? null);
      setFin(d.fin ?? null);
    }
  }, [numero]);

  const restante = useCronometro(NIVELES[nivel ?? "facil"].segundos, inicio, fin);
  const fallos = letras.filter((l) => !objetivo.has(l)).length;
  const acertado = [...objetivo].every((l) => letras.includes(l));
  const ahorcado = fallos >= MAX_FALLOS;
  const agotado = inicio != null && fin == null && restante === 0;
  const terminado = acertado || ahorcado || fin != null || agotado;
  const jugando = nivel != null && !terminado;

  const apuntar = useCallback(
    (parcial: Partial<Dia>) => {
      if (modo !== "dia") return;
      setGuardado((prev) => {
        const previo: Dia = prev.dias[numero] ?? { letras: [] };
        const g: Guardado = { dias: { ...prev.dias, [numero]: { ...previo, ...parcial } } };
        guardar(g);
        return g;
      });
    },
    [modo, numero],
  );

  // Se acabó el tiempo: la partida se cierra.
  useEffect(() => {
    if (!agotado) return;
    const ahora = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- respuesta al reloj (externo), una sola vez
    setFin(ahora);
    apuntar({ fin: ahora });
  }, [agotado, apuntar]);

  const pedir = useCallback(
    (l: string) => {
      if (!jugando || letras.includes(l)) return;
      const nuevas = [...letras, l];
      setLetras(nuevas);
      const f = nuevas.filter((x) => !objetivo.has(x)).length;
      const ok = [...objetivo].every((x) => nuevas.includes(x));
      const acaba = ok || f >= MAX_FALLOS;
      const ahora = Date.now();
      if (acaba) setFin(ahora);
      apuntar({ letras: nuevas, ...(acaba ? { fin: ahora, ok } : {}) });
    },
    [jugando, letras, objetivo, apuntar],
  );

  // Teclado físico.
  useEffect(() => {
    if (!jugando) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      const l = letraBase(e.key);
      if (l) {
        e.preventDefault();
        pedir(l);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [jugando, pedir]);

  function empezar(n: Nivel) {
    const ahora = Date.now();
    setNivel(n);
    setInicio(ahora);
    setFin(null);
    apuntar({ nivel: n, inicio: ahora });
  }

  function nuevo(l: number | null = liga) {
    startTransition(async () => {
      const p = await otroAhorcado(l, vistos);
      if (!p) return;
      setPractica(p);
      setVistos((v) => [...v, p.id]);
      setLetras([]);
      setCopiado(false);
      // En práctica se sigue con el mismo nivel y el reloj arranca de nuevo.
      setInicio(nivel ? Date.now() : null);
      setFin(null);
    });
  }

  function irA(m: "dia" | "practica") {
    if (m === modo) return;
    setModo(m);
    setCopiado(false);
    if (m === "dia") {
      const d = guardado.dias[numero];
      setLetras(d?.letras ?? []);
      setNivel(d?.nivel ?? null);
      setInicio(d?.inicio ?? null);
      setFin(d?.fin ?? null);
    } else {
      setLetras([]);
      nuevo();
    }
  }

  const puntos = nivel ? puntosAdivinar({ acertado, fallos, sobra: restante, nivel }) : 0;
  const compartir = `Ahorcado${modo === "dia" ? ` #${numero}` : ""} · ${acertado ? `¡Acertado con ${fallos} ${fallos === 1 ? "fallo" : "fallos"}!` : "Ahorcado 💀"}\n${"🟥".repeat(fallos)}${"⬜".repeat(MAX_FALLOS - fallos)}\nsoyreinaldo.com/juegos/ahorcado`;

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

      {modo === "practica" && (
        <div className="jg-dif">
          {[null, ...Object.keys(LIGAS_AHORCADO).map(Number)].map((id) => (
            <button
              key={id ?? "todas"}
              type="button"
              className={liga === id ? "is-on" : ""}
              onClick={() => {
                setLiga(id);
                nuevo(id);
              }}
            >
              {id ? LIGAS_AHORCADO[id] : "Todas"}
            </button>
          ))}
        </div>
      )}

      <div className="ah-pista">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo de la CDN de la API */}
        <img src={logoLiga(partida.liga.id)} alt="" width={36} height={36} />
        <div>
          <small>Juega en</small>
          <b>{partida.liga.nombre}</b>
        </div>
      </div>

      {!nivel && !terminado ? (
        <ElegirNivel onElegir={empezar} />
      ) : (
        <div className={`ah${cargando ? " is-cargando" : ""}`}>
          <div className="ah-izq">
            <Muneco fallos={fallos} ahorcado={ahorcado} />
            <p className="ah-fallos" aria-live="polite">
              {fallos === 0 ? "Sin fallos" : `${fallos}/${MAX_FALLOS}: ${PARTES.slice(0, fallos).join(", ")}`}
            </p>
          </div>

          <div className="jg-panel">
            {jugando && (
              <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
                <Timer className="ico-txt" aria-hidden /> {reloj(restante)} · {NIVELES[nivel].nombre}
              </span>
            )}

            <p className="ah-palabra" aria-label={terminado ? partida.palabra : "Apellido oculto"}>
              {partida.palabra.split(" ").map((palabra, i) => (
                <span key={i} className="ah-palabra__trozo">
                  {[...palabra].map((c, j) => {
                    const l = letraBase(c);
                    const visto = !l || letras.includes(l) || terminado;
                    const fallada = terminado && l && !letras.includes(l);
                    return (
                      <span key={j} className={`ah-letra${!l ? " is-signo" : ""}${fallada ? " is-faltaba" : ""}`}>
                        {visto ? c.toUpperCase() : ""}
                      </span>
                    );
                  })}
                </span>
              ))}
            </p>

            {terminado ? (
              <div className={`jg-final ${acertado ? "is-ok" : "is-mal"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API */}
                <img src={foto(partida.id)} alt="" width={56} height={56} className="ah-foto" />
                <div>
                  <p className="jg-final__tit">{acertado ? (fallos === 0 ? "¡Sin un fallo!" : `¡Acertado con ${fallos} ${fallos === 1 ? "fallo" : "fallos"}!`) : ahorcado ? "¡Ahorcado!" : "Se acabó el tiempo"}</p>
                  <p className="jg-final__eq">{partida.nombre}</p>
                  <p className="jg-final__ctx">
                    {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
                    <img src={escudo(partida.equipo.id)} alt="" width={16} height={16} className="ah-escudo" /> {partida.equipo.nombre}
                    {partida.posicion ? ` · ${partida.posicion}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="ah-teclado" role="group" aria-label="Teclado">
                {TECLADO.map((fila) => (
                  <div key={fila} className="ah-teclado__fila">
                    {[...fila].map((l) => {
                      const usada = letras.includes(l);
                      const bien = usada && objetivo.has(l);
                      return (
                        <button
                          key={l}
                          type="button"
                          className={`ah-tecla${usada ? (bien ? " is-ok" : " is-mal") : ""}`}
                          disabled={usada || !jugando}
                          onClick={() => pedir(l)}
                          aria-label={`Letra ${l}`}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {terminado && nivel && (
              <CierreJuego
                juego="ahorcado"
                dia={modo === "dia" ? numero : null}
                nivel={nivel}
                puntos={puntos}
                resultado={acertado ? `${fallos}/${MAX_FALLOS} fallos` : "Ahorcado"}
              />
            )}
            {terminado && (
              <div className="jg-acciones">
                {nativo ? (
                  <button type="button" className="btn btn--accent" onClick={() => navigator.share({ text: compartir }).catch(() => {})}>
                    Compartir resultado
                  </button>
                ) : (
                  <a className="btn btn--accent" href={`https://wa.me/?text=${encodeURIComponent(compartir)}`} target="_blank" rel="noopener noreferrer">
                    Compartir por WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(compartir)
                      .then(() => setCopiado(true))
                      .catch(() => {})
                  }
                >
                  {copiado ? "¡Copiado!" : "Copiar"}
                </button>
                {modo === "practica" ? (
                  <button type="button" className="btn btn--ghost" onClick={() => nuevo()} disabled={cargando}>
                    Otro jugador →
                  </button>
                ) : (
                  <button type="button" className="btn btn--ghost" onClick={() => irA("practica")}>
                    Seguir en práctica →
                  </button>
                )}
              </div>
            )}
            {modo === "dia" && terminado && <p className="pz-ayuda">Mañana, otro jugador.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
