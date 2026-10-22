"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  MAX_INTENTOS,
  opcionesDe,
  pistas,
  retoDelDia,
  retosDe,
  textoCompartir,
} from "@/lib/juegos/adivina-equipo";
import { NOMBRE_DIFICULTAD, type Dificultad, type Reto } from "@/lib/juegos/equipos-historicos";
import { NIVELES, puntosAdivinar, reloj, type Nivel } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import { useCronometro } from "@/components/juegos/useCronometro";

/**
 * «Adivina el equipo»: un once histórico con solo las banderas. El reto del
 * día es igual para todos y su resultado (y la racha) se guarda en el
 * navegador; la práctica va por dificultades y no guarda nada.
 *
 * Nivel y reloj (22-oct): antes de empezar se elige nivel (2:00, 1:30 o
 * 1:00); si se acaba el tiempo, la partida termina. Los puntos del reto del
 * día van al ranking (CierreJuego). El inicio queda guardado: recargar no
 * reinicia el reloj.
 */

const CLAVE = "jg-equipo-v1";
type Dia = { ids: number[]; ok: boolean; nivel?: Nivel; inicio?: number; fin?: number };
type Guardado = { dias: Record<number, Dia> };

const escudo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;
const bandera = (pais: string) => `https://media.api-sports.io/flags/${pais}.svg`;
const sinSuscripcion = () => () => {};

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

/** Días seguidos acertados hasta hoy (o hasta ayer si hoy aún no se jugó). */
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
  const [dificultad, setDificultad] = useState<Dificultad>("facil");
  const [practica, setPractica] = useState<Reto | null>(null);
  const [vistos, setVistos] = useState<string[]>([]);
  const [intentos, setIntentos] = useState<number[]>([]);
  const [guardado, setGuardado] = useState<Guardado>({ dias: {} });
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);

  const delDia = useMemo(() => retoDelDia(numero), [numero]);
  const reto = modo === "dia" ? delDia : (practica ?? delDia);
  const opciones = useMemo(() => opcionesDe(modo === "dia" ? "dificil" : dificultad), [modo, dificultad]);

  // El resultado de hoy, si ya se jugó en este navegador.
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
  const acertado = intentos.includes(reto.equipoId);
  const agotado = inicio != null && fin == null && restante === 0;
  const terminado = acertado || intentos.length >= MAX_INTENTOS || fin != null || agotado;

  /** Guarda el estado del día en el navegador (solo en el reto del día). */
  function apuntar(parcial: Partial<Dia>) {
    if (modo !== "dia") return;
    const previo: Dia = guardado.dias[numero] ?? { ids: [], ok: false };
    const g: Guardado = { dias: { ...guardado.dias, [numero]: { ...previo, ...parcial } } };
    setGuardado(g);
    guardar(g);
  }

  // Se acabó el tiempo: la partida se cierra.
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
  const fallos = intentos.filter((id) => id !== reto.equipoId).length;
  const pistasVistas = pistas(reto, terminado ? 4 : fallos);
  const nombreDe = (id: number) => opciones.find((o) => o.id === id)?.nombre ?? "—";

  const filtradas = useMemo(() => {
    const q = busca
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
    return opciones.filter(
      (o) =>
        !intentos.includes(o.id) &&
        (!q ||
          o.nombre
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .includes(q)),
    );
  }, [busca, opciones, intentos]);

  function intentar(id: number) {
    if (terminado || intentos.includes(id)) return;
    const nuevos = [...intentos, id];
    const acaba = nuevos.includes(reto.equipoId) || nuevos.length >= MAX_INTENTOS;
    const ahora = Date.now();
    setIntentos(nuevos);
    setBusca("");
    if (acaba) setFin(ahora);
    apuntar({ ids: nuevos, ok: nuevos.includes(reto.equipoId), ...(acaba ? { fin: ahora } : {}) });
  }

  function nuevoReto(d: Dificultad = dificultad) {
    const pool = retosDe(d);
    let libres = pool.filter((r) => !vistos.includes(r.id));
    if (libres.length === 0) libres = pool;
    const r = libres[Math.floor(Math.random() * libres.length)];
    setVistos((v) => (libres === pool ? [r.id] : [...v, r.id]));
    setPractica(r);
    setIntentos([]);
    setBusca("");
    setCopiado(false);
    // En práctica se sigue con el mismo nivel y el reloj arranca de nuevo.
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
  const cuadros = Array.from({ length: intentos.length }, (_, i) => (acertado && i === intentos.length - 1 ? "🟩" : "🟥")).join("");
  const texto = textoCompartir({ numero: modo === "dia" ? numero : null, acertado, intentos: intentos.length });
  // Solo cuentan los días terminados (acertados o con los cinco intentos).
  const cerrados = Object.values(guardado.dias).filter((d) => d.ok || d.ids.length >= MAX_INTENTOS || d.fin != null);
  const jugados = cerrados.length;
  const ganados = cerrados.filter((d) => d.ok).length;

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
          {(["facil", "medio", "dificil"] as Dificultad[]).map((d) => (
            <button
              key={d}
              type="button"
              className={d === dificultad ? "is-on" : ""}
              onClick={() => {
                setDificultad(d);
                nuevoReto(d);
              }}
            >
              {NOMBRE_DIFICULTAD[d]}
            </button>
          ))}
          <span className="jg-dif__nota">
            {dificultad === "facil"
              ? "LaLiga y Premier"
              : dificultad === "medio"
                ? "LaLiga, Premier, Serie A y Ligue 1"
                : "Las cinco grandes ligas"}
          </span>
        </div>
      )}

      {!nivel && !terminado ? (
        <ElegirNivel onElegir={empezar} />
      ) : (
      <div className="jg-cuerpo">
        <div className="jg-campo" aria-label={`Once en ${reto.formacion}`}>
          <span className="jg-campo__form">{reto.formacion}</span>
          {reto.lineas.map((linea, i) => (
            <div key={i} className="jg-linea">
              {linea.map(([nombre, pais], j) => (
                <div key={j} className="jg-jug">
                  {/* eslint-disable-next-line @next/next/no-img-element -- banderas SVG de la CDN de la API */}
                  <img src={bandera(pais)} alt={terminado ? nombre : "Bandera de un jugador"} width={40} height={40} />
                  <span className={terminado ? "jg-jug__n is-visto" : "jg-jug__n"}>{terminado ? nombre : "?"}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="jg-panel">
          <div className="jg-puntos" aria-label={`Intento ${Math.min(intentos.length + 1, MAX_INTENTOS)} de ${MAX_INTENTOS}`}>
            {Array.from({ length: MAX_INTENTOS }, (_, i) => {
              const id = intentos[i];
              const cls = id == null ? "" : id === reto.equipoId ? "is-ok" : "is-mal";
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
              {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
              <img src={escudo(reto.equipoId)} alt="" width={56} height={56} />
              <div>
                <p className="jg-final__tit">{acertado ? `¡Acertaste en ${intentos.length}!` : "¡Casi!"}</p>
                <p className="jg-final__eq">
                  {reto.equipo} {reto.temporada}
                </p>
                <p className="jg-final__ctx">{reto.contexto}</p>
                {!acertado && agotado && <p className="jg-final__ctx">⏱ Se acabó el tiempo.</p>}
              </div>
            </div>
          ) : (
            <div className="jg-busca">
              <label htmlFor="jg-q" className="jg-busca__lab">
                ¿Qué equipo es? Intento {intentos.length + 1} de {MAX_INTENTOS}
              </label>
              <input
                id="jg-q"
                type="search"
                autoComplete="off"
                placeholder="Escribe un equipo…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filtradas.length === 1) intentar(filtradas[0].id);
                }}
              />
              <ul className="jg-opciones">
                {filtradas.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => intentar(o.id)}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
                      <img src={escudo(o.id)} alt="" width={22} height={22} loading="lazy" />
                      {o.nombre}
                    </button>
                  </li>
                ))}
                {filtradas.length === 0 && <li className="jg-opciones__vacio">Ningún equipo con ese nombre</li>}
              </ul>
            </div>
          )}

          {intentos.some((id) => id !== reto.equipoId) && (
            <ul className="jg-fallos">
              {intentos
                .filter((id) => id !== reto.equipoId)
                .map((id) => (
                  <li key={id}>✗ {nombreDe(id)}</li>
                ))}
            </ul>
          )}

          {pistasVistas.length > 0 && (
            <ul className="jg-pistas">
              {pistasVistas.map((p) => (
                <li key={p.titulo}>
                  <b>{p.titulo}</b> {p.texto}
                </li>
              ))}
            </ul>
          )}
          {!terminado && fallos === 0 && (
            <p className="pz-ayuda" style={{ margin: 0 }}>
              Cada fallo desbloquea una pista: liga, temporada, partido y un nombre.
            </p>
          )}

          {terminado && nivel && (
            <CierreJuego
              juego="equipo"
              dia={modo === "dia" ? numero : null}
              nivel={nivel}
              puntos={puntos}
              resultado={`${cuadros} ${acertado ? intentos.length : "X"}/${MAX_INTENTOS}`}
            />
          )}
          {terminado && (
            <div className="jg-acciones">
              {nativo ? (
                <button type="button" className="btn btn--accent" onClick={() => navigator.share({ text: texto }).catch(() => {})}>
                  Compartir resultado
                </button>
              ) : (
                <a
                  className="btn btn--accent"
                  href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
                <button type="button" className="btn btn--ghost" onClick={() => nuevoReto()}>
                  Otro equipo →
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
          {modo === "dia" && terminado && <p className="pz-ayuda">Mañana, un equipo nuevo.</p>}
        </div>
      </div>
      )}
    </div>
  );
}
