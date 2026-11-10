"use client";

import { useState, useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

/** Botones del final de partida: compartir, copiar y seguir jugando. */
export default function AccionesFinal({
  texto,
  practica,
  onOtra,
  onPractica,
  otraTexto,
  cargando = false,
}: {
  texto: string;
  practica: boolean;
  onOtra: () => void;
  onPractica: () => void;
  otraTexto: string;
  cargando?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const nativo = useSyncExternalStore(sinSuscripcion, () => "share" in navigator, () => false);
  return (
    <div className="jg-acciones">
      {nativo ? (
        <button type="button" className="btn btn--accent" onClick={() => navigator.share({ text: texto }).catch(() => {})}>
          Compartir resultado
        </button>
      ) : (
        <a className="btn btn--accent" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
          Compartir por WhatsApp
        </a>
      )}
      <button
        type="button"
        className="btn"
        onClick={() =>
          navigator.clipboard
            .writeText(texto)
            .then(() => setCopiado(true))
            .catch(() => {})
        }
      >
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
      {practica ? (
        <button type="button" className="btn btn--ghost" onClick={onOtra} disabled={cargando}>
          {otraTexto} →
        </button>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={onPractica}>
          Seguir en práctica →
        </button>
      )}
    </div>
  );
}
