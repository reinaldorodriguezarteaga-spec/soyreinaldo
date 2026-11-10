"use client";
import { Timer } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { escudoDe, fotoDe, type Futbolista } from "@/lib/juegos/futbolistas-comun";
import { aleatorio } from "@/lib/juegos/diario";
import { NIVELES, puntosIntentos, reloj } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import AccionesFinal from "@/components/juegos/AccionesFinal";
import Buscador from "@/components/juegos/Buscador";
import { useCronometro } from "@/components/juegos/useCronometro";
import { usePartidaDiaria } from "@/components/juegos/usePartidaDiaria";

/**
 * «Foto oculta»: la foto tapada por una cuadrícula de 3×3. Se empieza con un
 * trozo destapado y cada fallo destapa otro, en un orden fijo por jugador
 * (la cara, que es lo que más delata, sale de las últimas). Pistas: la liga
 * al segundo fallo y el equipo al cuarto.
 */

const MAX = 6;
const VACIO: number[] = [];
/** Trozos de la cuadrícula (0-8). El 1 y el 4 (centro arriba) son la cara. */
const CARA = [1, 4];

/** Orden en que se destapan los trozos para este jugador: los de la cara, al final. */
function ordenTrozos(id: number): number[] {
  const azar = aleatorio(id);
  const resto = [0, 2, 3, 5, 6, 7, 8];
  for (let k = resto.length - 1; k > 0; k--) {
    const m = Math.floor(azar() * (k + 1));
    [resto[k], resto[m]] = [resto[m], resto[k]];
  }
  return [...resto, ...CARA];
}

export default function Juego({ numero, objetivoDia, jugadores }: { numero: number; objetivoDia: number; jugadores: Futbolista[] }) {
  const p = usePartidaDiaria<number[]>("jg-foto-v1", numero, VACIO);
  const [objetivoPractica, setObjetivoPractica] = useState<number | null>(null);
  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores]);
  const opciones = useMemo(
    () => jugadores.map((j) => ({ id: j.id, nombre: j.nombre, detalle: j.equipo.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [jugadores],
  );
  const objetivoId = p.modo === "dia" ? objetivoDia : (objetivoPractica ?? objetivoDia);
  const objetivo = porId.get(objetivoId)!;

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

  const orden = useMemo(() => ordenTrozos(objetivoId), [objetivoId]);
  const destapados = new Set(terminado ? orden : orden.slice(0, 1 + fallos));

  function intentar(id: number) {
    if (terminado || intentos.includes(id)) return;
    const nuevos = [...intentos, id];
    p.cambiarDatos(nuevos, id === objetivoId || nuevos.length >= MAX);
  }

  function nuevoObjetivo(excluir: number) {
    const libres = jugadores.filter((j) => j.id !== excluir);
    setObjetivoPractica(libres[Math.floor(aleatorio(Date.now())() * libres.length)].id);
  }

  function irA(m: "dia" | "practica") {
    if (m === p.modo) return;
    p.irA(m);
    if (m === "practica") nuevoObjetivo(objetivoDia);
  }

  const puntos = p.nivel ? puntosIntentos({ acertado, fallos, sobra: restante, nivel: p.nivel }) : 0;
  const cuadros = intentos.map((id) => (id === objetivoId ? "🟩" : "🟥")).join("");
  const texto = `Foto oculta${p.modo === "dia" ? ` #${numero}` : ""} · ${cuadros} ${acertado ? intentos.length : "X"}/${MAX}\nsoyreinaldo.com/juegos/foto-oculta`;

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
          <div className="fo-marco" aria-label={terminado ? objetivo.nombre : `Foto con ${destapados.size} de 9 trozos destapados`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API */}
            <img src={fotoDe(objetivo.id)} alt="" width={240} height={240} className="fo-foto" draggable={false} />
            <div className="fo-tapas" aria-hidden>
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={`fo-tapa${destapados.has(i) ? " is-fuera" : ""}`} />
              ))}
            </div>
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
                {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
                <img src={escudoDe(objetivo.equipo.id)} alt="" width={56} height={56} />
                <div>
                  <p className="jg-final__tit">{acertado ? `¡Acertaste en ${intentos.length}!` : "¡Casi!"}</p>
                  <p className="jg-final__eq">{objetivo.nombre}</p>
                  <p className="jg-final__ctx">
                    {objetivo.equipo.nombre}
                    {objetivo.posicion ? ` · ${objetivo.posicion}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <Buscador opciones={opciones} usados={intentos} onElegir={intentar} etiqueta="¿Quién es?" placeholder="Escribe un jugador…" />
            )}

            {fallos > 0 && (
              <ul className="jg-fallos">
                {intentos
                  .filter((id) => id !== objetivoId)
                  .map((id) => (
                    <li key={id}>✗ {porId.get(id)?.nombre}</li>
                  ))}
              </ul>
            )}
            {!terminado && fallos >= 2 && (
              <ul className="jg-pistas">
                <li>
                  <b>Pista</b> Juega en {objetivo.liga.nombre}.
                </li>
                {fallos >= 4 && (
                  <li>
                    <b>Pista</b> Su equipo es el {objetivo.equipo.nombre}.
                  </li>
                )}
              </ul>
            )}
            {!terminado && fallos === 0 && (
              <p className="pz-ayuda" style={{ margin: 0 }}>
                Cada fallo destapa un trozo. Al segundo te damos la liga y al cuarto, el equipo.
              </p>
            )}

            {terminado && p.nivel && (
              <CierreJuego
                juego="foto"
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
                otraTexto="Otro jugador"
              />
            )}
            {p.modo === "dia" && terminado && <p className="pz-ayuda">Mañana, otra foto.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
