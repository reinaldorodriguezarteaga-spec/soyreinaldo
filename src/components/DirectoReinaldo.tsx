"use client";

import { useEffect, useState } from "react";
import type { DirectoYoutube } from "@/lib/youtube/directo";

/** Cada cuánto se pregunta si hay directo (la respuesta va cacheada 60 s). */
const CADA_MS = 120_000;

/**
 * "▶ Reinaldo en directo" (16-oct, pedido del dueño): pill que sale cuando
 * hay directo en YouTube; al tocarla abre un reproductor flotante que sigue
 * sonando mientras navegas (vive en el layout). En móvil se apila encima de
 * la pill de partidos "EN VIVO".
 */
export default function DirectoReinaldo() {
  const [directo, setDirecto] = useState<DirectoYoutube>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    const mirar = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/directo-youtube");
        const j = (await r.json()) as { directo: DirectoYoutube };
        if (vivo) setDirecto(j.directo);
      } catch {
        // Sin red: se queda como estaba.
      }
    };
    mirar();
    const t = setInterval(mirar, CADA_MS);
    document.addEventListener("visibilitychange", mirar);
    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", mirar);
    };
  }, []);

  if (!directo) return null;

  if (!abierto) {
    return (
      <button type="button" className="ytpill" onClick={() => setAbierto(true)} title={directo.titulo}>
        <span className="livepulse" />
        ▶ REINALDO EN DIRECTO
      </button>
    );
  }

  return (
    <div className="ytplayer" role="dialog" aria-label="Directo de Reinaldo">
      <div className="ytplayer__cab">
        <span className="livepulse" />
        <span className="ytplayer__titulo">{directo.titulo || "Reinaldo en directo"}</span>
        <a
          href={`https://www.youtube.com/watch?v=${directo.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ytplayer__btn"
          title="Abrir en YouTube (para escribir en el chat)"
        >
          YouTube ↗
        </a>
        <button type="button" className="ytplayer__btn" onClick={() => setAbierto(false)} aria-label="Cerrar">
          ✕
        </button>
      </div>
      <div className="ytplayer__video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${directo.videoId}?autoplay=1&playsinline=1`}
          title={directo.titulo || "Reinaldo en directo"}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
