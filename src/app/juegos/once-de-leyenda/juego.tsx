"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { HUECOS, LINEAS, NOMBRE_PUESTO, resultado, ternas, type Leyenda } from "@/lib/juegos/leyendas";

/**
 * Once de leyenda: en cada ronda, tres leyendas para un puesto y te quedas
 * una. Las medias se ven al terminar. El del día (mismas ternas para todos)
 * se guarda en el navegador; la práctica sortea ternas nuevas.
 */

const CLAVE = "jg-leyendas-v1";
const bandera = (pais: string) => `https://media.api-sports.io/flags/${pais}.svg`;
const sinSuscripcion = () => () => {};

function leer(): Record<number, number[]> {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
    return g && typeof g === "object" ? g : {};
  } catch {
    return {};
  }
}

export default function Juego({ numero }: { numero: number }) {
  const [modo, setModo] = useState<"dia" | "practica">("dia");
  const [semillaPractica, setSemillaPractica] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [guardado, setGuardado] = useState<Record<number, number[]>>({});
  const [copiado, setCopiado] = useState(false);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  const ts = useMemo(() => ternas(modo === "dia" ? numero * 101 : semillaPractica), [modo, numero, semillaPractica]);
  const elegidos: Leyenda[] = picks.map((k, i) => ts[i][k]);
  const ronda = picks.length;
  const fin = ronda === HUECOS.length;
  const res = fin ? resultado(elegidos, ts) : null;

  useEffect(() => {
    const g = leer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setGuardado(g);
    if (g[numero]) setPicks(g[numero]);
  }, [numero]);

  function elegir(k: number) {
    if (fin) return;
    const nuevos = [...picks, k];
    setPicks(nuevos);
    if (modo === "dia") {
      const g = { ...guardado, [numero]: nuevos };
      setGuardado(g);
      try {
        localStorage.setItem(CLAVE, JSON.stringify(g));
      } catch {
        // Sin storage: se juega igual.
      }
    }
  }

  function irA(m: "dia" | "practica") {
    setModo(m);
    setCopiado(false);
    if (m === "dia") setPicks(guardado[numero] ?? []);
    else {
      setSemillaPractica(100_000 + Math.floor(Math.random() * 1_000_000));
      setPicks([]);
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

      <div className="jg-cuerpo">
        <div className="jg-campo" aria-label="Tu once en 4-3-3">
          <span className="jg-campo__form">4-3-3</span>
          {LINEAS.map((linea, i) => (
            <div key={i} className="jg-linea">
              {linea.map((h) => {
                const x = elegidos[h];
                return (
                  <div key={h} className={`jg-jug${h === ronda && !fin ? " is-turno" : ""}`}>
                    {x ? (
                      // eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API
                      <img src={bandera(x.pais)} alt="" width={40} height={40} />
                    ) : (
                      <span className="jg-jug__vacio">{HUECOS[h]}</span>
                    )}
                    <span className={x ? "jg-jug__n is-visto" : "jg-jug__n"}>
                      {x ? (fin ? `${x.nombre.split(" ").at(-1)} ${x.media}` : x.nombre.split(" ").at(-1)) : "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="jg-panel">
          {!fin ? (
            <>
              <p className="jg-busca__lab" style={{ margin: 0 }}>
                Ronda {ronda + 1} de 11 · {NOMBRE_PUESTO[HUECOS[ronda]]}
              </p>
              <div className="ol-terna">
                {ts[ronda].map((x, k) => (
                  <button key={x.nombre} type="button" className="ol-carta" onClick={() => elegir(k)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API */}
                    <img src={bandera(x.pais)} alt="" width={36} height={36} />
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
                    <p className="jg-final__tit">Tu once tiene de media</p>
                    <p className="jg-final__eq">{res.media}</p>
                    <p className="jg-final__ctx">
                      El mejor posible: {res.maxima}. Elegiste al mejor en {res.mejores} de 11 puestos.
                    </p>
                  </div>
                </div>
                <ul className="ol-repaso">
                  {ts.map((t, i) => (
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
    </div>
  );
}
