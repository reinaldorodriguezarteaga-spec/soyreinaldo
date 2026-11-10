"use client";
import { Timer } from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { MAX_ERRORES_AGRUPA, PANELES, mezclar, type Panel } from "@/lib/juegos/agrupa";
import { aleatorio, delDia } from "@/lib/juegos/diario";
import { NIVELES, SEGUNDOS_TOP10, puntosAgrupa, reloj } from "@/lib/juegos/niveles";
import ElegirNivel from "@/components/juegos/ElegirNivel";
import CierreJuego from "@/components/juegos/CierreJuego";
import AccionesFinal from "@/components/juegos/AccionesFinal";
import { useCronometro } from "@/components/juegos/useCronometro";
import { usePartidaDiaria } from "@/components/juegos/usePartidaDiaria";

/**
 * «Agrupa los cuatro»: se comprueba casilla a casilla. La primera que se toca
 * queda en azul; cada una de las siguientes se compara con ella: si es del
 * mismo grupo, todas las elegidas pasan a verde; si no, solo esa se pone en
 * rojo un momento y cuenta un error. Al acertar la cuarta, el grupo se
 * resuelve solo. Cuatro errores y se destapa todo. Paneles en
 * `lib/juegos/agrupa.ts`. Tiempo como el Top 10 (más largo).
 */

/** `probados`: «grupo|nombre» ya fallados, para no cobrar dos veces el mismo error. */
type Datos = { resueltos: string[]; errores: number; probados: string[] };
const VACIO: Datos = { resueltos: [], errores: 0, probados: [] };
const COLOR = ["ag-g0", "ag-g1", "ag-g2", "ag-g3"];
const EMOJI = ["🟨", "🟩", "🟦", "🟪"];

export default function Juego({ numero }: { numero: number }) {
  const p = usePartidaDiaria<Datos>("jg-agrupa-v1", numero, VACIO);
  const [panelPractica, setPanelPractica] = useState<Panel | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [rojo, setRojo] = useState<string | null>(null);
  const panelDia = useMemo(() => delDia(PANELES, numero), [numero]);
  const panel = p.modo === "dia" ? panelDia : (panelPractica ?? panelDia);
  const orden = useMemo(() => mezclar(panel, p.modo === "dia" ? numero : panel.id.length), [panel, p.modo, numero]);

  const { resueltos, errores, probados } = p.datos;
  const restante = useCronometro(SEGUNDOS_TOP10[p.nivel ?? "facil"], p.inicio, p.fin);
  const completo = resueltos.length === 4;
  const sinVidas = errores >= MAX_ERRORES_AGRUPA;
  const agotado = p.inicio != null && p.fin == null && restante === 0;
  const terminado = completo || sinVidas || p.fin != null || agotado;
  const { terminar } = p;
  useEffect(() => {
    if (agotado) terminar();
  }, [agotado, terminar]);

  const grupoDe = (nombre: string) => panel.grupos.find((g) => g.nombres.includes(nombre))!;
  // Al terminar, se ven todos los grupos (los no resueltos, después).
  const gruposVistos = terminado
    ? [...resueltos.map((t) => panel.grupos.find((g) => g.titulo === t)!), ...panel.grupos.filter((g) => !resueltos.includes(g.titulo))]
    : resueltos.map((t) => panel.grupos.find((g) => g.titulo === t)!);
  const sueltos = orden.filter((n) => !gruposVistos.some((g) => g.nombres.includes(n)));

  // El rojo se ve un momento y la casilla vuelve a quedar libre.
  useEffect(() => {
    if (!rojo) return;
    const t = setTimeout(() => setRojo(null), 700);
    return () => clearTimeout(t);
  }, [rojo]);

  function tocar(nombre: string) {
    if (terminado || rojo) return;
    setAviso(null);
    if (elegidos.includes(nombre)) {
      // Solo se puede soltar la azul (las verdes ya están confirmadas).
      if (elegidos.length === 1) setElegidos([]);
      return;
    }
    if (elegidos.length === 0) {
      setElegidos([nombre]);
      return;
    }
    const grupo = grupoDe(elegidos[0]);
    if (grupo.nombres.includes(nombre)) {
      const nuevos = [...elegidos, nombre];
      if (nuevos.length === 4) {
        const hechos = [...resueltos, grupo.titulo];
        p.cambiarDatos({ resueltos: hechos, errores, probados }, hechos.length === 4);
        setElegidos([]);
      } else {
        setElegidos(nuevos);
      }
      return;
    }
    setRojo(nombre);
    const clave = `${grupo.titulo}|${nombre}`;
    if (probados.includes(clave)) {
      setAviso("Ya lo has probado: ese no va.");
      return;
    }
    const e = errores + 1;
    p.cambiarDatos({ resueltos, errores: e, probados: [...probados, clave] }, e >= MAX_ERRORES_AGRUPA);
    setAviso(elegidos.length === 1 ? "Esos dos no van juntos." : "Ese no es del grupo.");
  }

  function barajar() {
    setElegidos([]);
    setAviso(null);
  }

  function otro() {
    const libres = PANELES.filter((x) => x.id !== panel.id);
    setPanelPractica(libres[Math.floor(aleatorio(Date.now())() * libres.length)]);
    setElegidos([]);
    setAviso(null);
    p.reiniciar();
  }

  function irA(m: "dia" | "practica") {
    if (m === p.modo) return;
    p.irA(m);
    setElegidos([]);
    setAviso(null);
    if (m === "practica") {
      const libres = PANELES.filter((x) => x.id !== panelDia.id);
      setPanelPractica(libres[Math.floor(aleatorio(Date.now())() * libres.length)]);
    }
  }

  const puntos = p.nivel ? puntosAgrupa({ grupos: resueltos.length, errores, sobra: restante, nivel: p.nivel }) : 0;
  const filas = resueltos.map((t) => EMOJI[panel.grupos.find((g) => g.titulo === t)!.nivel].repeat(4)).join("\n");
  const texto = `Agrupa los cuatro${p.modo === "dia" ? ` #${numero}` : ""} · ${resueltos.length}/4 grupos, ${errores} ${errores === 1 ? "error" : "errores"}\n${filas}\nsoyreinaldo.com/juegos/agrupa-los-cuatro`;

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
        <ElegirNivel onElegir={p.empezar} segundos={SEGUNDOS_TOP10} />
      ) : (
        <div className="ag">
          {p.nivel && !terminado && (
            <span className={`jreloj${restante <= 10 ? " is-poco" : ""}`} aria-label="Tiempo que queda">
              <Timer className="ico-txt" aria-hidden /> {reloj(restante)} · {NIVELES[p.nivel].nombre}
            </span>
          )}

          {gruposVistos.map((g) => (
            <div key={g.titulo} className={`ag-grupo ${COLOR[g.nivel]}${resueltos.includes(g.titulo) ? "" : " is-perdido"}`}>
              <b>{g.titulo}</b>
              <span>{g.nombres.join(" · ")}</span>
            </div>
          ))}

          {sueltos.length > 0 && (
            <div className="ag-rejilla">
              {sueltos.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`ag-casilla${rojo === n ? " is-mal" : elegidos.includes(n) ? (elegidos.length === 1 ? " is-on" : " is-ok") : ""}`}
                  onClick={() => tocar(n)}
                  aria-pressed={elegidos.includes(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {!terminado && (
            <>
              <div className="ag-vidas" aria-label={`${MAX_ERRORES_AGRUPA - errores} errores que quedan`}>
                Errores que quedan:{" "}
                {Array.from({ length: MAX_ERRORES_AGRUPA }, (_, i) => (
                  <span key={i} className={`ag-vida${i < MAX_ERRORES_AGRUPA - errores ? "" : " is-gastada"}`} />
                ))}
              </div>
              {aviso && (
                <p className="ag-aviso" role="status">
                  {aviso}
                </p>
              )}
              <div className="jg-acciones">
                <button type="button" className="btn btn--ghost" onClick={barajar} disabled={elegidos.length === 0}>
                  Quitar selección
                </button>
              </div>
            </>
          )}

          {terminado && (
            <div className={`jg-final ${completo ? "is-ok" : "is-mal"}`}>
              <div>
                <p className="jg-final__tit">
                  {completo ? (errores === 0 ? "¡Perfecto, sin errores!" : `¡Los cuatro grupos! (${errores} ${errores === 1 ? "error" : "errores"})`) : `${resueltos.length} de 4 grupos`}
                </p>
                {!completo && <p className="jg-final__ctx">{agotado ? "Se acabó el tiempo." : "Arriba tienes la solución."}</p>}
              </div>
            </div>
          )}
          {terminado && p.nivel && (
            <CierreJuego juego="agrupa" dia={p.modo === "dia" ? numero : null} nivel={p.nivel} puntos={puntos} resultado={`${resueltos.length}/4 · ${errores} err.`} />
          )}
          {terminado && <AccionesFinal texto={texto} practica={p.modo === "practica"} onOtra={otro} onPractica={() => irA("practica")} otraTexto="Otro panel" />}
          {p.modo === "dia" && terminado && <p className="pz-ayuda">Mañana, otro panel.</p>}
        </div>
      )}
    </div>
  );
}
