"use client";
import { Camera } from "lucide-react";

import { useState } from "react";
import BotonCompartir from "@/components/BotonCompartir";
import { guardarEnGaleria } from "@/lib/app-galeria";

/**
 * Compartir una IMAGEN, no solo el enlace (18-oct, pedido del dueño: que la
 * gente suba la foto de Messi vs Cristiano a sus redes). En el móvil abre la
 * hoja del sistema con la foto adjunta (Instagram, WhatsApp, X...). Donde no
 * se puede compartir un archivo (casi todo el escritorio), la descarga, y al
 * lado queda el botón de siempre para el enlace.
 */
export default function CompartirImagen({
  imagen,
  nombreArchivo,
  url,
  texto,
  soloBoton = false,
}: {
  /** Ruta de la imagen en esta web. */
  imagen: string;
  nombreArchivo: string;
  /** URL absoluta de la página. */
  url: string;
  texto: string;
  /** Solo el botón de la imagen, con el estilo pequeño de las fichas (el
   * de compartir enlace ya está al lado). */
  soloBoton?: boolean;
}) {
  const [cargando, setCargando] = useState(false);

  const compartir = async () => {
    setCargando(true);
    try {
      const blob = await fetch(imagen).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      });
      if (await guardarEnGaleria(blob, nombreArchivo)) {
        alert("Imagen guardada en tu galería ✓");
        return;
      }
      const archivo = new File([blob], nombreArchivo, { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], text: `${texto} ${url}` });
        } catch {
          // Hoja cerrada: no es un error.
        }
        return;
      }
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      enlace.download = nombreArchivo;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
    } catch {
      // Sin red: abre la imagen y que la guarde a mano.
      window.open(imagen, "_blank", "noopener");
    } finally {
      setCargando(false);
    }
  };

  if (soloBoton) {
    return (
      <button type="button" className="compartir__btn" onClick={compartir} disabled={cargando}>
        <span aria-hidden><Camera className="ico-txt" aria-hidden /></span> {cargando ? "Preparando…" : "Imagen para redes"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      <button type="button" className="btn btn--accent" onClick={compartir} disabled={cargando}>
        <Camera className="ico-txt" aria-hidden /> {cargando ? "Preparando la imagen…" : "Compartir imagen"}
      </button>
      <BotonCompartir url={url} texto={texto} etiqueta="Compartir enlace" />
    </div>
  );
}
