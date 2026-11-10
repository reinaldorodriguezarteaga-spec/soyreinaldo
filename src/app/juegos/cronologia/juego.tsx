"use client";
import { ArrowDown, ArrowUp, Timer } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { MAX_INTENTOS_CRONOLOGIA, partidaCronologia } from "@/lib/juegos/cronologia";
import { NIVELES, puntosCronologia, reloj } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import AccionesFinal from "@/components/juegos/AccionesFinal";
import { useCronometro } from "@/components/juegos/useCronometro";
import { usePartidaDiaria } from "@/components/juegos/usePartidaDiaria";

/**
 * «Cronología»: cinco momentos revueltos que se ordenan con flechas. Al
 * comprobar, los que están en su sitio se marcan en verde (y se quedan
 * fijos). Tres intentos. Momentos en `lib/juegos/cronologia.ts`.
 */

/** `orden`: ids en el orden del jugador. `intentos`: cuántas veces comprobó.
 * `fijos`: ids ya confirmados en su sitio. */
type Datos = { orden: string[]; intentos: number; fijos: string[] };
const VACIO: Datos = { orden: [], intentos: 0, fijos: [] };

export default function Juego({ numero }: { numero: number }) {
  const p = usePartidaDiaria<Datos>("jg-cronologia-v1", numero, VACIO);
  const [semillaPractica, setSemillaPractica] = useState<number | null>(null);
  const semilla = p.modo === "dia" ? numero : (semillaPractica ?? numero + 100000);
  const momentos = useMemo(() => partidaCronologia(semilla), [semilla]);
  const correcto = useMemo(() => [...momentos].sort((a, b) => a.anio - b.anio).map((m) => m.id), [momentos]);
  const porId = useMemo(() => new Map(momentos.map((m) => [m.id, m])), [momentos]);

  const orden = p.datos.orden.length === momentos.length ? p.datos.orden : momentos.map((m) => m.id);
  const { intentos, fijos } = p.datos;
  const restante = useCronometro(NIVELES[p.nivel ?? "facil"].segundos, p.inicio, p.fin);
  const acertado = intentos > 0 && orden.every((id, i) => correcto[i] === id);
  const agotado = p.inicio != null && p.fin == null && restante === 0;
  const terminado = acertado || intentos >= MAX_INTENTOS_CRONOLOGIA || p.fin != null || agotado;
  const { terminar } = p;
  useEffect(() => {
    if (agotado) terminar();
  }, [agotado, terminar]);

  function mover(i: number, d: -1 | 1) {
    if (terminado) return;
    const j = i + d;
    if (j < 0 || j >= orden.length || fijos.includes(orden[i]) || fijos.includes(orden[j])) return;
    const nuevo = [...orden];
    [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
    p.cambiarDatos({ orden: nuevo, intentos, fijos });
  }

  function comprobar() {
    if (terminado) return;
    const bien = orden.filter((id, i) => correcto[i] === id);
    const n = intentos + 1;
    const todo = bien.length === orden.length;
    p.cambiarDatos({ orden, intentos: n, fijos: bien }, todo || n >= MAX_INTENTOS_CRONOLOGIA);
  }

  function otra() {
    setSemillaPractica(Date.now() % 1_000_000_000);
    p.reiniciar();
  }

  function irA(m: "dia" | "practica") {
    if (m === p.modo) return;
    p.irA(m);
    if (m === "practica") setSemillaPractica(Date.now() % 1_000_000_000);
  }

  const vista = terminado ? correcto : orden;
  const puntos = p.nivel ? puntosCronologia({ acertado, intentos, sobra: restante, nivel: p.nivel }) : 0;
  const texto = `Cronología${p.modo === "dia" ? ` #${numero}` : ""} · ${acertado ? `¡Ordenada en ${intentos}!` : "No me salió"}\n${orden.map((id, i) => (correcto[i] === id ? "🟩" : "🟥")).join("")}\nsoyreinaldo.com/juegos/cronologia`;

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
        <div className="cr">
          {p.nivel && !terminado && (
            <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
              <Timer className="ico-txt" aria-hidden /> {reloj(restante)} · {NIVELES[p.nivel].nombre} · Intento {intentos + 1} de {MAX_INTENTOS_CRONOLOGIA}
            </span>
          )}
          <p className="cr-eje">Más antiguo ↑</p>
          <ol className="cr-lista">
            {vista.map((id, i) => {
              const m = porId.get(id)!;
              const fijo = fijos.includes(id) || terminado;
              const bien = terminado ? orden[i] === id : fijos.includes(id);
              return (
                <li key={id} className={`cr-fila${bien ? " is-ok" : terminado ? " is-mal" : ""}`}>
                  <span className="cr-texto">
                    {m.texto}
                    {terminado && <b className="cr-anio">{m.anio}</b>}
                  </span>
                  {!fijo && (
                    <span className="cr-flechas">
                      <button type="button" aria-label="Subir" onClick={() => mover(i, -1)} disabled={i === 0}>
                        <ArrowUp aria-hidden />
                      </button>
                      <button type="button" aria-label="Bajar" onClick={() => mover(i, 1)} disabled={i === vista.length - 1}>
                        <ArrowDown aria-hidden />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="cr-eje">Más reciente ↓</p>

          {!terminado ? (
            <div className="jg-acciones">
              <button type="button" className="btn btn--accent" onClick={comprobar}>
                Comprobar
              </button>
              {intentos > 0 && (
                <span className="pz-ayuda" style={{ alignSelf: "center" }}>
                  En verde, los que ya están en su sitio.
                </span>
              )}
            </div>
          ) : (
            <div className={`jg-final ${acertado ? "is-ok" : "is-mal"}`}>
              <div>
                <p className="jg-final__tit">{acertado ? (intentos === 1 ? "¡A la primera!" : `¡Ordenada en ${intentos}!`) : agotado ? "Se acabó el tiempo" : "¡Casi!"}</p>
                <p className="jg-final__ctx">Este es el orden bueno, con el año de cada momento.</p>
              </div>
            </div>
          )}

          {terminado && p.nivel && (
            <CierreJuego
              juego="cronologia"
              dia={p.modo === "dia" ? numero : null}
              nivel={p.nivel}
              puntos={puntos}
              resultado={acertado ? `${intentos}/${MAX_INTENTOS_CRONOLOGIA}` : `X/${MAX_INTENTOS_CRONOLOGIA}`}
            />
          )}
          {terminado && <AccionesFinal texto={texto} practica={p.modo === "practica"} onOtra={otra} onPractica={() => irA("practica")} otraTexto="Otra cronología" />}
          {p.modo === "dia" && terminado && <p className="pz-ayuda">Mañana, otra cronología.</p>}
        </div>
      )}
    </div>
  );
}
