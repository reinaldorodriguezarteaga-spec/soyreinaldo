"use client";

import { caraPorNombre } from "@/lib/juegos/caras";
import { caraOnce } from "@/lib/juegos/caras-onces";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { HUECOS, LINEAS, NOMBRE_PUESTO, resultado, ternas, type Leyenda } from "@/lib/juegos/leyendas";
import { NIVELES, puntosLeyenda, reloj, type Nivel } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import { useCronometro } from "@/components/juegos/useCronometro";

/**
 * Once de leyenda: en cada ronda, tres leyendas para un puesto y te quedas
 * una. Las medias se ven al terminar. El del día (mismas ternas para todos)
 * se guarda en el navegador; la práctica sortea ternas nuevas.
 */

type Dia = { picks: number[]; nivel?: Nivel; inicio?: number; fin?: number };
type Guardado = Record<number, Dia>;

const CLAVE = "jg-leyendas-v1";
const bandera = (pais: string) => `https://media.api-sports.io/flags/${pais}.svg`;
const sinSuscripcion = () => () => {};

function leer(): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Record<number, Dia | number[]>;
    return g && typeof g === "object"
      ? Object.fromEntries(Object.entries(g).map(([dia, valor]) => [dia, Array.isArray(valor) ? { picks: valor } : valor]))
      : {};
  } catch {
    return {};
  }
}

export default function Juego({ numero }: { numero: number }) {
  const [modo, setModo] = useState<"dia" | "practica">("dia");
  const [semillaPractica, setSemillaPractica] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [guardado, setGuardado] = useState<Guardado>({});
  const [copiado, setCopiado] = useState(false);
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  const ts = useMemo(() => ternas(modo === "dia" ? numero * 101 : semillaPractica), [modo, numero, semillaPractica]);
  const elegidos: Leyenda[] = picks.map((k, i) => ts[i][k]);
  const ronda = picks.length;
  const restante = useCronometro(NIVELES[nivel ?? "facil"].segundos, inicio, fin);
  const agotado = inicio != null && fin == null && restante === 0;
  const completo = ronda === HUECOS.length;
  const terminado = completo || fin != null || agotado;
  // El resumen solo compara los puestos elegidos; sin elecciones, las medias son cero.
  const res = terminado ? (ronda > 0 ? resultado(elegidos, ts.slice(0, ronda)) : { media: 0, maxima: 0, mejores: 0 }) : null;
  const puntos = nivel && res ? puntosLeyenda({ mejores: res.mejores, sobra: restante, nivel, terminado: completo }) : 0;

  useEffect(() => {
    const g = leer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setGuardado(g);
    const d = g[numero];
    if (d) {
      setPicks(d.picks);
      setNivel(d.nivel ?? null);
      setInicio(d.inicio ?? null);
      setFin(d.fin ?? null);
    }
  }, [numero]);

  function apuntar(parcial: Partial<Dia>) {
    if (modo !== "dia") return;
    const g: Guardado = { ...guardado, [numero]: { ...(guardado[numero] ?? { picks: [] }), ...parcial } };
    setGuardado(g);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(g));
    } catch {
      // Sin storage: se juega igual.
    }
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

  function elegir(k: number, ahora: number) {
    if (terminado || !nivel) return;
    const nuevos = [...picks, k];
    const acaba = nuevos.length === HUECOS.length;
    setPicks(nuevos);
    if (acaba) setFin(ahora);
    apuntar({ picks: nuevos, ...(acaba ? { fin: ahora } : {}) });
  }

  function irA(m: "dia" | "practica") {
    setModo(m);
    setCopiado(false);
    if (m === "dia") {
      const d = guardado[numero];
      setPicks(d?.picks ?? []);
      setNivel(d?.nivel ?? null);
      setInicio(d?.inicio ?? null);
      setFin(d?.fin ?? null);
    } else {
      setSemillaPractica(100_000 + Math.floor(Math.random() * 1_000_000));
      setPicks([]);
      setInicio(nivel ? Date.now() : null);
      setFin(null);
    }
  }

  const texto = res
    ? `Mi once de leyenda${modo === "dia" ? ` #${numero}` : ""}: ${res.media} de media (${res.mejores}/11 aciertos) ⭐\nsoyreinaldo.com/juegos/once-de-leyenda`
    : "";

  return (
    <div className="jg">
      <div className="jg-modos" role="tablist">
        <button type="button" role="tab" aria-selected={modo === "dia"} className={modo === "dia" ? "is-on" : ""} onClick={() => modo !== "dia" && irA("dia")}>
          Once del día #{numero}
        </button>
        <button type="button" role="tab" aria-selected={modo === "practica"} className={modo === "practica" ? "is-on" : ""} onClick={() => irA("practica")}>
          {modo === "practica" ? "Otro sorteo" : "Práctica"}
        </button>
      </div>

      {!nivel && !terminado ? (
        <ElegirNivel onElegir={empezar} />
      ) : (
        <div className="jg-cuerpo">
          <div className="jg-campo" aria-label="Tu once en 4-3-3">
            <span className="jg-campo__form">4-3-3</span>
            {LINEAS.map((linea, i) => (
              <div key={i} className="jg-linea">
                {linea.map((h) => {
                  const x = elegidos[h];
                  return (
                    <div key={h} className={`jg-jug${h === ronda && !terminado ? " is-turno" : ""}`}>
                      {x ? (
                        // eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API
                        <img src={caraPorNombre(x.nombre) ?? caraOnce(x.nombre, x.pais) ?? bandera(x.pais)} alt="" width={40} height={40} />
                      ) : (
                        <span className="jg-jug__vacio">{HUECOS[h]}</span>
                      )}
                      <span className={x ? "jg-jug__n is-visto" : "jg-jug__n"}>
                        {x ? (terminado ? `${x.nombre.split(" ").at(-1)} ${x.media}` : x.nombre.split(" ").at(-1)) : "?"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="jg-panel">
            {nivel && !terminado && (
              <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
                ⏱ {reloj(restante)} · {NIVELES[nivel].nombre}
              </span>
            )}

            {!terminado ? (
              <>
                <p className="jg-busca__lab" style={{ margin: 0 }}>
                  Ronda {ronda + 1} de 11 · {NOMBRE_PUESTO[HUECOS[ronda]]}
                </p>
                <div className="ol-terna">
                  {ts[ronda].map((x, k) => (
                    <button key={x.nombre} type="button" className="ol-carta" onClick={() => elegir(k, Date.now())}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API */}
                      <img src={caraPorNombre(x.nombre) ?? caraOnce(x.nombre, x.pais) ?? bandera(x.pais)} alt="" width={36} height={36} />
                      <b>{x.nombre}</b>
                    </button>
                  ))}
                </div>
                <p className="pz-ayuda" style={{ margin: 0 }}>
                  Las medias se ven al final. Elige siempre al que creas mejor.
                </p>
              </>
            ) : (
              res && (
                <>
                  <div className="jg-final is-ok">
                    <div>
                      {!completo && <p className="jg-final__ctx">⏱ Se acabó el tiempo. Elegiste {ronda} de 11 puestos.</p>}
                      <p className="jg-final__tit">Tu once tiene de media</p>
                      <p className="jg-final__eq">{res.media}</p>
                      <p className="jg-final__ctx">
                        El mejor posible: {res.maxima}. Elegiste al mejor en {res.mejores} de {ronda} puestos.
                      </p>
                    </div>
                  </div>
                  <ul className="ol-repaso">
                    {ts.slice(0, ronda).map((t, i) => (
                      <li key={i}>
                        <b>{HUECOS[i]}</b>
                        {t.map((x, k) => (
                          <span key={x.nombre} className={k === picks[i] ? "is-mio" : ""}>
                            {x.nombre.split(" ").at(-1)} {x.media}
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                  {nivel && (
                    <CierreJuego juego="leyenda" dia={modo === "dia" ? numero : null} nivel={nivel} puntos={puntos} resultado={`${res.mejores}/11 ⭐`}
                      extra={picks.length === 11 ? { k: picks.join("") } : undefined}
                    />
                  )}
                  <div className="jg-acciones">
                    {nativo ? (
                      <button type="button" className="btn btn--accent" onClick={() => navigator.share({ text: texto }).catch(() => {})}>
                        Compartir
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
                    <button type="button" className="btn btn--ghost" onClick={() => irA("practica")}>
                      {modo === "practica" ? "Otro sorteo →" : "Jugar en práctica →"}
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
