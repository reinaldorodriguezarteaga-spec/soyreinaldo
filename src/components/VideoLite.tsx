"use client";
import { Play } from "lucide-react";

import { useState } from "react";

/**
 * Vídeo de YouTube "ligero": solo la miniatura hasta que se toca (el iframe
 * de YouTube pesa ~1 MB de JS y frenaría la ficha del partido).
 */
export default function VideoLite({ id, titulo }: { id: string; titulo: string }) {
  const [activo, setActivo] = useState(false);
  return (
    <figure className="videolite">
      <div className="videolite__marco">
        {activo ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`}
            title={titulo}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setActivo(true)} aria-label={`Ver: ${titulo}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="videolite__play" aria-hidden><Play className="ico-txt" aria-hidden /></span>
          </button>
        )}
      </div>
      <figcaption>{titulo}</figcaption>
    </figure>
  );
}
