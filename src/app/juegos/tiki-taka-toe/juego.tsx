"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { JUGADORES, clubId, clubNombre } from "@/lib/juegos/carreras";
import { normalizar } from "@/lib/juegos/diario";
import { MAX_INTENTOS_TT, jugaronEnAmbos, tableroDelDia, valeEn, type Tablero } from "@/lib/juegos/tikitaka";

/**
 * Tiki-taka-toe: eliges casilla, escribes un jugador que haya pasado por el
 * club de la fila y el de la columna. Nueve intentos; el tablero del día se
 * guarda en el navegador y la práctica genera tableros nuevos.
 */

const CLAVE = "jg-tikitaka-v1";
type Partida = { celdas: Record<number, string>; intentos: number };
type Guardado = { dias: Record<number, Partida> };

const escudo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;
const sinSuscripcion = () => () => {};
const ORDENADOS = [...JUGADORES].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
const nombreDe = (id: string) => JUGADORES.find((j) => j.id === id)?.nombre ?? "—";
const VACIA: Partida = { celdas: {}, intentos: 0 };

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

export default function Juego({ numero }: { numero: number }) {
  const [modo, setModo] = useState<"dia" | "practica">("dia");
  const [tableroPractica, setTableroPractica] = useState<Tablero | null>(null);
  const [partida, setPartida] = useState<Partida>(VACIA);
  const [guardado, setGuardado] = useState<Guardado>({ dias: {} });
  const [casilla, setCasilla] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  const delDia = useMemo(() => tableroDelDia(numero), [numero]);
  const tablero = modo === "dia" ? delDia : (tableroPractica ?? delDia);

  useEffect(() => {
    const g = leer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setGuardado(g);
    if (g.dias[numero]) setPartida(g.dias[numero]);
  }, [numero]);

  const aciertos = Object.keys(partida.celdas).length;
  const terminado = aciertos === 9 || partida.intentos >= MAX_INTENTOS_TT;
  const usados = new Set(Object.values(partida.celdas));
  const filaDe = (i: number) => tablero.filas[Math.floor(i / 3)];
  const columnaDe = (i: number) => tablero.columnas[i % 3];

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    if (q.length < 2) return [];
    return ORDENADOS.filter((j) => normalizar(j.nombre).includes(q)).slice(0, 8);
  }, [busca]);

  function actualizar(p: Partida) {
    setPartida(p);
    if (modo === "dia") {
      const g: Guardado = { dias: { ...guardado.dias, [numero]: p } };
      setGuardado(g);
      guardar(g);
    }
  }

  function intentar(id: string) {
    if (casilla == null || terminado) return;
    const j = JUGADORES.find((x) => x.id === id);
    if (!j) return;
    if (usados.has(id)) {
      setAviso(`${j.nombre} ya está en otra casilla.`);
      return;
    }
    const ok = valeEn(j, filaDe(casilla), columnaDe(casilla));
    const p: Partida = {
      celdas: ok ? { ...partida.celdas, [casilla]: id } : partida.celdas,
      intentos: partida.intentos + 1,
    };
    actualizar(p);
    setAviso(ok ? null : `${j.nombre} no jugó en los dos.`);
    setBusca("");
    if (ok) setCasilla(null);
  }

  function nuevoTablero() {
    setTableroPractica(tableroDelDia(1000 + Math.floor(Math.random() * 1_000_000)));
    setPartida(VACIA);
    setCasilla(null);
    setAviso(null);
    setBusca("");
    setCopiado(false);
  }

  function irA(m: "dia" | "practica") {
    if (m === modo) return;
    setModo(m);
    setCasilla(null);
    setAviso(null);
    setCopiado(false);
    if (m === "dia") setPartida(guardado.dias[numero] ?? VACIA);
    else nuevoTablero();
  }

  const cuadros = [0, 1, 2]
    .map((f) => [0, 1, 2].map((c) => (partida.celdas[f * 3 + c] ? "🟩" : "⬜")).join(""))
    .join("\n");
  const texto = `Tiki-taka-toe${modo === "dia" ? ` #${numero}` : ""} · ${aciertos}/9\n${cuadros}\nsoyreinaldo.com/juegos/tiki-taka-toe`;

  return (
    <div className="jg">
      <div className="jg-modos" role="tablist">
        <button type="button" role="tab" aria-selected={modo === "dia"} className={modo === "dia" ? "is-on" : ""} onClick={() => irA("dia")}>
          Tablero del día #{numero}
        </button>
        <button type="button" role="tab" aria-selected={modo === "practica"} className={modo === "practica" ? "is-on" : ""} onClick={() => irA("practica")}>
          Práctica
        </button>
      </div>

      <div className="jg-cuerpo">
        <div className="tt">
          <div className="tt-esquina">
            <b>{MAX_INTENTOS_TT - partida.intentos}</b>
            <span>intentos</span>
          </div>
          {tablero.columnas.map((c) => (
            <div key={c} className="tt-cab">
              {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
              <img src={escudo(clubId(c))} alt="" width={40} height={40} />
              <span>{clubNombre(c)}</span>
            </div>
          ))}
          {[0, 1, 2].map((f) => (
            <div key={f} className="tt-fila">
              <div className="tt-cab">
                {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
                <img src={escudo(clubId(tablero.filas[f]))} alt="" width={40} height={40} />
                <span>{clubNombre(tablero.filas[f])}</span>
              </div>
              {[0, 1, 2].map((c) => {
                const i = f * 3 + c;
                const puesto = partida.celdas[i];
                const solucion = terminado && !puesto ? jugaronEnAmbos(filaDe(i), columnaDe(i)).find((j) => !usados.has(j.id)) : null;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`tt-celda${puesto ? " is-ok" : ""}${casilla === i ? " is-sel" : ""}`}
                    disabled={!!puesto || terminado}
                    aria-label={`${clubNombre(filaDe(i))} y ${clubNombre(columnaDe(i))}`}
                    onClick={() => {
                      setCasilla(i);
                      setAviso(null);
                    }}
                  >
                    {puesto ? nombreDe(puesto) : solucion ? <i>{solucion.nombre}</i> : "+"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="jg-panel">
          {terminado ? (
            <div className={`jg-final ${aciertos === 9 ? "is-ok" : "is-mal"}`}>
              <div>
                <p className="jg-final__tit">{aciertos === 9 ? "¡Tablero completo!" : "Se acabaron los intentos"}</p>
                <p className="jg-final__eq">{aciertos}/9</p>
                {aciertos < 9 && <p className="jg-final__ctx">En cursiva, un jugador que valía en cada casilla vacía.</p>}
              </div>
            </div>
          ) : casilla == null ? (
            <p className="pz-ayuda" style={{ margin: 0 }}>
              Elige una casilla y escribe un jugador que haya jugado en el club de su fila y en el de su columna. Cada
              jugador vale solo una vez.
            </p>
          ) : (
            <div className="jg-busca">
              <label htmlFor="jg-qt" className="jg-busca__lab">
                {clubNombre(filaDe(casilla))} + {clubNombre(columnaDe(casilla))}
              </label>
              <input
                id="jg-qt"
                type="search"
                autoComplete="off"
                autoFocus
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
          {aviso && <p className="jg-aviso">{aviso}</p>}

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
                <button type="button" className="btn btn--ghost" onClick={nuevoTablero}>
                  Otro tablero →
                </button>
              ) : (
                <button type="button" className="btn btn--ghost" onClick={() => irA("practica")}>
                  Seguir en práctica →
                </button>
              )}
            </div>
          )}
          {modo === "dia" && terminado && <p className="pz-ayuda">Mañana, tablero nuevo.</p>}
        </div>
      </div>
    </div>
  );
}
