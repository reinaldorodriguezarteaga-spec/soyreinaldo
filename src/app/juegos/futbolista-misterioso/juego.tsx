"use client";
import { ArrowDown, ArrowUp, Timer } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { MAX_INTENTOS_MISTERIOSO, comparar } from "@/lib/juegos/misterioso-comun";
import { banderaDe, escudoDe, fotoDe, type Futbolista } from "@/lib/juegos/futbolistas-comun";
import { NIVELES, puntosIntentos, reloj } from "@/lib/juegos/niveles";
import { aleatorio } from "@/lib/juegos/diario";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import AccionesFinal from "@/components/juegos/AccionesFinal";
import Buscador from "@/components/juegos/Buscador";
import { useCronometro } from "@/components/juegos/useCronometro";
import { usePartidaDiaria } from "@/components/juegos/usePartidaDiaria";

/**
 * «Futbolista misterioso»: se elige un jugador cualquiera y cada casilla dice
 * si coincide con el misterioso. Para arrancar se da una pista de salida (la
 * liga), que orienta sin regalarlo. Reto del día (al ranking) y práctica.
 */

const VACIO: number[] = [];
const EMOJI = { ok: "🟩", cerca: "🟨", no: "⬛" } as const;

export default function Juego({ numero, objetivoDia, jugadores }: { numero: number; objetivoDia: number; jugadores: Futbolista[] }) {
  const p = usePartidaDiaria<number[]>("jg-misterioso-v1", numero, VACIO);
  const [objetivoPractica, setObjetivoPractica] = useState<number | null>(null);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const opciones = useMemo(
    () => jugadores.map((j) => ({ id: j.id, nombre: j.nombre, detalle: j.equipo.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [jugadores],
  );

  const objetivoId = p.modo === "dia" ? objetivoDia : (objetivoPractica ?? objetivoDia);
  const misterioso = porId.get(objetivoId)!;
  const intentos = p.datos;
  const restante = useCronometro(NIVELES[p.nivel ?? "facil"].segundos, p.inicio, p.fin);
  const acertado = intentos.includes(objetivoId);
  const agotado = p.inicio != null && p.fin == null && restante === 0;
  const terminado = acertado || intentos.length >= MAX_INTENTOS_MISTERIOSO || p.fin != null || agotado;
  // Se acabó el tiempo: la partida se cierra.
  const { terminar } = p;
  useEffect(() => {
    if (agotado) terminar();
  }, [agotado, terminar]);

  function intentar(id: number) {
    if (terminado || intentos.includes(id)) return;
    const nuevos = [...intentos, id];
    p.cambiarDatos(nuevos, id === objetivoId || nuevos.length >= MAX_INTENTOS_MISTERIOSO);
  }

  function otro() {
    const libres = jugadores.filter((j) => j.id !== objetivoId);
    setObjetivoPractica(libres[Math.floor(aleatorio(Date.now())() * libres.length)].id);
    p.reiniciar();
  }

  function irA(m: "dia" | "practica") {
    if (m === p.modo) return;
    p.irA(m);
    if (m === "practica") {
      const libres = jugadores.filter((j) => j.id !== objetivoDia);
      setObjetivoPractica(libres[Math.floor(aleatorio(Date.now())() * libres.length)].id);
    }
  }

  const fallos = intentos.filter((id) => id !== objetivoId).length;
  const puntos = p.nivel ? puntosIntentos({ acertado, fallos, sobra: restante, nivel: p.nivel }) : 0;
  const filasEmoji = intentos
    .map((id) => comparar(porId.get(id)!, misterioso).map((x) => EMOJI[x.estado]).join(""))
    .join("\n");
  const texto = `Futbolista misterioso${p.modo === "dia" ? ` #${numero}` : ""} · ${acertado ? `${intentos.length}/${MAX_INTENTOS_MISTERIOSO}` : `X/${MAX_INTENTOS_MISTERIOSO}`}\n${filasEmoji}\nsoyreinaldo.com/juegos/futbolista-misterioso`;

  return (
    <div className="jg">
      <div className="jg-modos" role="tablist">
        <button type="button" role="tab" aria-selected={p.modo === "dia"} className={p.modo === "dia" ? "is-on" : ""} onClick={() => irA("dia")}>
          Reto del día #{numero}
        </button>
        <button type="button" role="tab" aria-selected={p.modo === "practica"} className={p.modo === "practica" ? "is-on" : ""} onClick={() => irA("practica")}>
          Práctica
        </button>
      </div>

      {!p.nivel && !terminado ? (
        <ElegirNivel onElegir={p.empezar} />
      ) : (
        <div className="jg-panel">
          {p.nivel && !terminado && (
            <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
              <Timer className="ico-txt" aria-hidden /> {reloj(restante)} · {NIVELES[p.nivel].nombre} · Intento {intentos.length + 1} de {MAX_INTENTOS_MISTERIOSO}
            </span>
          )}

          {terminado ? (
            <div className={`jg-final ${acertado ? "is-ok" : "is-mal"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API */}
              <img src={fotoDe(misterioso.id)} alt="" width={56} height={56} className="ah-foto" />
              <div>
                <p className="jg-final__tit">{acertado ? `¡Acertaste en ${intentos.length}!` : "¡Casi!"}</p>
                <p className="jg-final__eq">{misterioso.nombre}</p>
                <p className="jg-final__ctx">
                  {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
                  <img src={escudoDe(misterioso.equipo.id)} alt="" width={16} height={16} className="ah-escudo" /> {misterioso.equipo.nombre}
                  {misterioso.posicion ? ` · ${misterioso.posicion}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <>
              <ul className="jg-pistas">
                <li>
                  <b>Pista</b> Juega en {misterioso.liga.nombre}.
                </li>
              </ul>
              <Buscador opciones={opciones} usados={intentos} onElegir={intentar} etiqueta="¿Quién es?" placeholder="Escribe un jugador…" />
            </>
          )}

          {intentos.length > 0 && (
            <div className="mi-tabla" role="table" aria-label="Intentos">
              <div className="mi-fila mi-cab" role="row">
                <span role="columnheader">Jugador</span>
                {comparar(porId.get(intentos[0])!, misterioso).map((x) => (
                  <span key={x.campo} role="columnheader">
                    {x.campo}
                  </span>
                ))}
              </div>
              {[...intentos].reverse().map((id) => {
                const j = porId.get(id)!;
                return (
                  <div key={id} className="mi-fila" role="row">
                    <span className="mi-nombre" role="cell">
                      {j.nombre}
                    </span>
                    {comparar(j, misterioso).map((x) => (
                      <span key={x.campo} className={`mi-celda is-${x.estado}`} role="cell" title={x.campo}>
                        {x.bandera ? (
                          // eslint-disable-next-line @next/next/no-img-element -- bandera de la CDN de la API
                          <img src={banderaDe(x.bandera)} alt={x.texto} width={22} height={16} />
                        ) : x.campo === "Equipo" ? (
                          // eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API
                          <img src={escudoDe(j.equipo.id)} alt={x.texto} title={x.texto} width={22} height={22} />
                        ) : (
                          <span className="mi-txt">{x.texto}</span>
                        )}
                        {x.flecha === "arriba" && <ArrowUp className="mi-flecha" aria-label="más" />}
                        {x.flecha === "abajo" && <ArrowDown className="mi-flecha" aria-label="menos" />}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {!terminado && intentos.length === 0 && (
            <p className="pz-ayuda" style={{ margin: 0 }}>
              Verde: coincide. Amarillo: cerca (edad a 2 años, dorsal a 3). La flecha dice si el misterioso tiene más o
              menos.
            </p>
          )}

          {terminado && p.nivel && (
            <CierreJuego
              juego="misterioso"
              dia={p.modo === "dia" ? numero : null}
              nivel={p.nivel}
              puntos={puntos}
              resultado={`${acertado ? intentos.length : "X"}/${MAX_INTENTOS_MISTERIOSO}`}
            />
          )}
          {terminado && (
            <AccionesFinal texto={texto} practica={p.modo === "practica"} onOtra={otro} onPractica={() => irA("practica")} otraTexto="Otro jugador" />
          )}
          {p.modo === "dia" && terminado && <p className="pz-ayuda">Mañana, otro misterioso.</p>}
        </div>
      )}
    </div>
  );
}
