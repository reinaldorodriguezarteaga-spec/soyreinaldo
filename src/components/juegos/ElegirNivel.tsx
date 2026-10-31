"use client";
import { Timer } from "lucide-react";

import { NIVELES, reloj, type Nivel } from "@/lib/juegos/niveles";

/** Antes de empezar: el nivel decide el tiempo y cuánto multiplican los puntos. */
export default function ElegirNivel({ onElegir, titulo = "Elige nivel para empezar" }: { onElegir: (n: Nivel) => void; titulo?: string }) {
  return (
    <div className="jn">
      <p className="jn__tit">{titulo}</p>
      <div className="jn__opciones">
        {(Object.keys(NIVELES) as Nivel[]).map((n) => (
          <button key={n} type="button" className={`jn__op jn__op--${n}`} onClick={() => onElegir(n)}>
            <b>{NIVELES[n].nombre}</b>
            <span><Timer className="ico-txt" aria-hidden /> {reloj(NIVELES[n].segundos)}</span>
            <span className="jn__mult">×{String(NIVELES[n].mult).replace(".", ",")} puntos</span>
          </button>
        ))}
      </div>
      <p className="pz-ayuda" style={{ margin: 0 }}>
        El reloj empieza al elegir. Si se acaba, la partida termina.
      </p>
    </div>
  );
}
