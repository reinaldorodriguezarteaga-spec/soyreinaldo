"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Flag } from "lucide-react";
import { enviarReporte, type TipoReporte } from "@/app/actions/reportes";

/**
 * «Reportar un fallo» (5-nov, pedido del dueño): un dato mal (goles de un
 * jugador, un resultado…) o un error de la web. Va en el pie de todas las
 * páginas y junto a los números de las fichas (`contexto` dice de qué ficha).
 * La página se manda sola; el reporte llega a /admin/reportes y al móvil del
 * dueño.
 */
export default function ReportarFallo({
  variante = "enlace",
  contexto,
  tipoInicial = "dato",
  texto = "Reportar un fallo",
}: {
  variante?: "enlace" | "boton";
  contexto?: string;
  tipoInicial?: TipoReporte;
  texto?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const ruta = usePathname();
  const [tipo, setTipo] = useState<TipoReporte>(tipoInicial);
  const [mensaje, setMensaje] = useState("");
  const [contacto, setContacto] = useState("");
  const [estado, setEstado] = useState<"listo" | "enviando" | "hecho">("listo");
  const [error, setError] = useState<string | null>(null);

  function abrir() {
    setEstado("listo");
    setError(null);
    dialogo.current?.showModal();
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setError(null);
    const r = await enviarReporte({
      tipo,
      texto: mensaje,
      url: ruta + (typeof window !== "undefined" ? window.location.search : ""),
      contexto,
      contacto,
    }).catch(() => ({ ok: false as const, error: "No se pudo enviar ahora." }));
    if (r.ok) {
      setEstado("hecho");
      setMensaje("");
    } else {
      setEstado("listo");
      setError(r.error);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={variante === "boton" ? "reporte-btn" : "reporte-enlace"}
      >
        <Flag className="ico-txt" aria-hidden /> {texto}
      </button>

      <dialog ref={dialogo} className="reporte" onClick={(e) => e.target === dialogo.current && dialogo.current?.close()}>
        {estado === "hecho" ? (
          <div className="reporte__cuerpo">
            <h2>¡Gracias!</h2>
            <p>Nos llega al momento y lo revisamos. Así la web mejora para todos.</p>
            <button type="button" className="btn btn--accent" onClick={() => dialogo.current?.close()}>
              Cerrar
            </button>
          </div>
        ) : (
          <form className="reporte__cuerpo" onSubmit={enviar}>
            <h2>Reportar un fallo</h2>
            {contexto && <p className="reporte__ctx">{contexto}</p>}
            <div className="reporte__tipos" role="radiogroup" aria-label="Qué pasa">
              {(
                [
                  ["dato", "Un dato está mal"],
                  ["fallo", "Algo no funciona"],
                  ["otro", "Otra cosa"],
                ] as const
              ).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={tipo === v}
                  className={tipo === v ? "on" : ""}
                  onClick={() => setTipo(v)}
                >
                  {t}
                </button>
              ))}
            </div>
            <label>
              <span>
                {tipo === "dato"
                  ? "¿Qué dato está mal y cuál es el bueno?"
                  : tipo === "fallo"
                    ? "¿Qué estabas haciendo y qué pasó?"
                    : "Cuéntanos"}
              </span>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                maxLength={2000}
                required
                placeholder={tipo === "dato" ? "Ej.: Pedri lleva 3 goles en LaLiga, no 2." : ""}
              />
            </label>
            <label>
              <span>Tu contacto, por si hay que preguntarte (opcional)</span>
              <input value={contacto} onChange={(e) => setContacto(e.target.value)} maxLength={200} placeholder="@usuario o correo" />
            </label>
            {error && <p className="reporte__error">{error}</p>}
            <div className="reporte__acciones">
              <button type="button" className="btn" onClick={() => dialogo.current?.close()}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--accent" disabled={estado === "enviando" || mensaje.trim().length < 3}>
                {estado === "enviando" ? "Enviando…" : "Enviar"}
              </button>
            </div>
            <p className="reporte__nota">Se envía también la página en la que estás.</p>
          </form>
        )}
      </dialog>
    </>
  );
}
