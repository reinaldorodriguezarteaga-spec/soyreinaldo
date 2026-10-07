"use client";

import { useState, useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

/** Botones para compartir la tarjeta: WhatsApp, menú nativo del móvil o copiar. */
export default function Compartir({ url, texto }: { url: string; texto: string }) {
  const [copiado, setCopiado] = useState(false);
  // En el servidor no hay `navigator`: false allí y el valor real en el
  // navegador, sin desajuste al hidratar.
  const nativo = useSyncExternalStore(
    sinSuscripcion,
    () => "share" in navigator,
    () => false,
  );

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
      <a
        className="btn btn--accent"
        href={`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Compartir por WhatsApp
      </a>
      {nativo && (
        <button
          type="button"
          className="btn"
          onClick={() => navigator.share({ title: texto, text: texto, url }).catch(() => {})}
        >
          Compartir…
        </button>
      )}
      <button
        type="button"
        className="btn"
        onClick={() =>
          navigator.clipboard
            .writeText(url)
            .then(() => setCopiado(true))
            .catch(() => {})
        }
      >
        {copiado ? "¡Enlace copiado!" : "Copiar enlace"}
      </button>
    </div>
  );
}
