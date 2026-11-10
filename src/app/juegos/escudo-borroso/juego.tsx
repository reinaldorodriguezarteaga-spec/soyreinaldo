"use client";
import { Timer } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { opcionesDe } from "@/lib/juegos/adivina-equipo";
import { LIGAS_JUEGO } from "@/lib/juegos/equipos-historicos";
import { aleatorio, delDia } from "@/lib/juegos/diario";
import { escudoDe } from "@/lib/juegos/futbolistas-comun";
import { NIVELES, puntosIntentos, reloj } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import AccionesFinal from "@/components/juegos/AccionesFinal";
import Buscador from "@/components/juegos/Buscador";
import { useCronometro } from "@/components/juegos/useCronometro";
import { usePartidaDiaria } from "@/components/juegos/usePartidaDiaria";

/**
 * «Escudo borroso» (10-nov-2026): el escudo de un equipo de las cinco grandes
 * ligas, muy desenfocado y en gris; cada fallo lo aclara. Los equipos son los
 * de «Adivina el equipo» (ids comprobados contra la API). Al tercer fallo,
 * la liga como pista.
 */

const MAX = 6;
/** Desenfoque (px) según los fallos; al acabar, nítido. */
const BORROSO = [26, 18, 12, 8, 5, 3];
const VACIO: number[] = [];

export default function Juego({ numero }: { numero: number }) {
  const p = usePartidaDiaria<number[]>("jg-escudo-v1", numero, VACIO);
  const equipos = useMemo(() => opcionesDe("dificil"), []);
  const [objetivoPractica, setObjetivoPractica] = useState<number | null>(null);
  const objetivoDia = useMemo(() => delDia(equipos, numero).id, [equipos, numero]);
  const objetivoId = p.modo === "dia" ? objetivoDia : (objetivoPractica ?? objetivoDia);
  const objetivo = equipos.find((e) => e.id === objetivoId)!;
  const opciones = useMemo(() => equipos.map((e) => ({ id: e.id, nombre: e.nombre, imagen: undefined })), [equipos]);

  const intentos = p.datos;
  const restante = useCronometro(NIVELES[p.nivel ?? "facil"].segundos, p.inicio, p.fin);
  const acertado = intentos.includes(objetivoId);
  const fallos = intentos.filter((id) => id !== objetivoId).length;
  const agotado = p.inicio != null && p.fin == null && restante === 0;
  const terminado = acertado || intentos.length >= MAX || p.fin != null || agotado;
  const { terminar } = p;
  useEffect(() => {
    if (agotado) terminar();
  }, [agotado, terminar]);

  function intentar(id: number) {
    if (terminado || intentos.includes(id)) return;
    const nuevos = [...intentos, id];
    p.cambiarDatos(nuevos, id === objetivoId || nuevos.length >= MAX);
  }

  function nuevoObjetivo(excluir: number) {
    const libres = equipos.filter((e) => e.id !== excluir);
    setObjetivoPractica(libres[Math.floor(aleatorio(Date.now())() * libres.length)].id);
  }

  function irA(m: "dia" | "practica") {
    if (m === p.modo) return;
    p.irA(m);
    if (m === "practica") nuevoObjetivo(objetivoDia);
  }

  const desenfoque = terminado ? 0 : BORROSO[Math.min(fallos, BORROSO.length - 1)];
  const gris = !terminado && fallos < 3;
  const puntos = p.nivel ? puntosIntentos({ acertado, fallos, sobra: restante, nivel: p.nivel }) : 0;
  const cuadros = intentos.map((id) => (id === objetivoId ? "🟩" : "🟥")).join("");
  const texto = `Escudo borroso${p.modo === "dia" ? ` #${numero}` : ""} · ${cuadros} ${acertado ? intentos.length : "X"}/${MAX}\nsoyreinaldo.com/juegos/escudo-borroso`;

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
        <div className="jg-cuerpo">
          <div className="eb-marco">
            {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
            <img
              src={escudoDe(objetivo.id)}
              alt={terminado ? objetivo.nombre : "Escudo borroso"}
              width={220}
              height={220}
              className="eb-escudo"
              style={{ filter: `blur(${desenfoque}px)${gris ? " grayscale(1)" : ""}` }}
              draggable={false}
            />
          </div>
          <div className="jg-panel">
            <div className="jg-puntos" aria-label={`Intento ${Math.min(intentos.length + 1, MAX)} de ${MAX}`}>
              {Array.from({ length: MAX }, (_, i) => {
                const id = intentos[i];
                return <span key={i} className={`jg-punto ${id == null ? "" : id === objetivoId ? "is-ok" : "is-mal"}`} />;
              })}
            </div>
            {p.nivel && !terminado && (
              <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
                <Timer className="ico-txt" aria-hidden /> {reloj(restante)} · {NIVELES[p.nivel].nombre}
              </span>
            )}

            {terminado ? (
              <div className={`jg-final ${acertado ? "is-ok" : "is-mal"}`}>
                <div>
                  <p className="jg-final__tit">{acertado ? `¡Acertaste en ${intentos.length}!` : "¡Casi!"}</p>
                  <p className="jg-final__eq">{objetivo.nombre}</p>
                  <p className="jg-final__ctx">{LIGAS_JUEGO[objetivo.liga]}</p>
                </div>
              </div>
            ) : (
              <Buscador opciones={opciones} usados={intentos} onElegir={intentar} etiqueta="¿De qué equipo es?" placeholder="Escribe un equipo…" />
            )}

            {fallos > 0 && (
              <ul className="jg-fallos">
                {intentos
                  .filter((id) => id !== objetivoId)
                  .map((id) => (
                    <li key={id}>✗ {equipos.find((e) => e.id === id)?.nombre}</li>
                  ))}
              </ul>
            )}
            {!terminado && fallos >= 3 && (
              <ul className="jg-pistas">
                <li>
                  <b>Pista</b> Juega en {LIGAS_JUEGO[objetivo.liga]}.
                </li>
              </ul>
            )}
            {!terminado && fallos === 0 && (
              <p className="pz-ayuda" style={{ margin: 0 }}>
                Cada fallo lo aclara un poco. Al tercero recupera el color y te damos la liga.
              </p>
            )}

            {terminado && p.nivel && (
              <CierreJuego
                juego="escudo"
                dia={p.modo === "dia" ? numero : null}
                nivel={p.nivel}
                puntos={puntos}
                resultado={`${cuadros} ${acertado ? intentos.length : "X"}/${MAX}`}
              />
            )}
            {terminado && (
              <AccionesFinal
                texto={texto}
                practica={p.modo === "practica"}
                onOtra={() => {
                  nuevoObjetivo(objetivoId);
                  p.reiniciar();
                }}
                onPractica={() => irA("practica")}
                otraTexto="Otro escudo"
              />
            )}
            {p.modo === "dia" && terminado && <p className="pz-ayuda">Mañana, otro escudo.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
