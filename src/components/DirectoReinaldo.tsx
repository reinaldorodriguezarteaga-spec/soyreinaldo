"use client";
import { MessageCircle, Play, ArrowUpRight } from "lucide-react";

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
  const [chat, setChat] = useState(false);

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
        <Play className="ico-txt" aria-hidden /> REINALDO EN DIRECTO
      </button>
    );
  }

  return (
    <div className="ytplayer" role="dialog" aria-label="Directo de Reinaldo">
      <div className="ytplayer__cab">
        <span className="livepulse" />
        <span className="ytplayer__titulo">{directo.titulo || "Reinaldo en directo"}</span>
        <button
          type="button"
          className={`ytplayer__btn${chat ? " on" : ""}`}
          onClick={() => setChat((c) => !c)}
          aria-pressed={chat}
          title="Ver y escribir en el chat del directo"
        >
          <MessageCircle className="ico-txt" aria-hidden /> Chat
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${directo.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ytplayer__btn"
          title="Abrir en YouTube"
        >
          YouTube <ArrowUpRight className="ico-txt" aria-hidden />
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
      {/* Chat del directo (17-oct): el de YouTube, incrustado. Para escribir
          hay que tener sesión de YouTube en este navegador; si el navegador
          bloquea sus cookies, el propio chat ofrece abrirlo en YouTube. */}
      {chat && (
        <div className="ytplayer__chat">
          <iframe
            src={`https://www.youtube.com/live_chat?v=${directo.videoId}&embed_domain=${typeof window === "undefined" ? "www.soyreinaldo.com" : window.location.hostname}`}
            title="Chat del directo"
          />
        </div>
      )}
    </div>
  );
}
