"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CompartirImagen from "@/components/CompartirImagen";
import { guardarResultado } from "@/app/juegos/acciones";
import { NIVELES, NOMBRE_JUEGO, type JuegoRanking, type Nivel } from "@/lib/juegos/niveles";

/**
 * Final de partida común a los juegos: puntos, apunte en el ranking (solo el
 * reto del día) y la imagen del resultado para compartir en redes.
 */
export default function CierreJuego({
  juego,
  dia,
  nivel,
  puntos,
  resultado,
}: {
  juego: JuegoRanking;
  /** Número del reto del día; null en práctica (no cuenta para el ranking). */
  dia: number | null;
  nivel: Nivel;
  puntos: number;
  /** Línea corta para la imagen: «🟥🟩 2/5», «7/9», «racha 12». */
  resultado: string;
}) {
  const [estado, setEstado] = useState<"guardando" | "nuevo" | "ya" | "sesion" | "nada" | "error">(dia ? "guardando" : "nada");
  const enviado = useRef(false);

  useEffect(() => {
    if (!dia || enviado.current) return;
    enviado.current = true;
    guardarResultado({ juego, dia, nivel, puntos })
      .then((r) => setEstado(r.ok ? (r.nuevo ? "nuevo" : "ya") : r.error === "sesion" ? "sesion" : "error"))
      .catch(() => setEstado("error"));
  }, [juego, dia, nivel, puntos]);

  const q = new URLSearchParams({ j: juego, n: nivel, p: String(puntos), r: resultado.slice(0, 40), ...(dia ? { d: String(dia) } : {}) });
  const texto = `${NOMBRE_JUEGO[juego]}${dia ? ` #${dia}` : ""}: ${puntos} puntos en ${NIVELES[nivel].nombre.toLowerCase()} 🎮`;

  return (
    <div className="jc">
      <div className="jc__puntos">
        <b>{puntos}</b>
        <span>puntos · {NIVELES[nivel].nombre}</span>
      </div>
      <p className="jc__ranking">
        {estado === "guardando" && "Apuntando en el ranking…"}
        {estado === "nuevo" && (
          <>
            ✓ Sumados al <Link href="/juegos/ranking">ranking de la semana →</Link>
          </>
        )}
        {estado === "ya" && (
          <>
            Ya tenías este reto en el <Link href="/juegos/ranking">ranking</Link>: cuenta la primera partida.
          </>
        )}
        {estado === "sesion" && (
          <>
            <Link href="/login">Entra</Link> para que tus puntos cuenten en el ranking.
          </>
        )}
        {estado === "nada" && "En práctica no se suman puntos al ranking."}
        {estado === "error" && "No se pudo apuntar en el ranking."}
      </p>
      <CompartirImagen
        soloBoton
        imagen={`/juegos/imagen?${q}`}
        nombreArchivo={`${juego}-soyreinaldo.png`}
        url="https://www.soyreinaldo.com/juegos"
        texto={texto}
      />
    </div>
  );
}
