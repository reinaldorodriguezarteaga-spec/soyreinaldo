"use client";
import Icono from "@/components/Icono";
import { Bell } from "lucide-react";

import { useState, useSyncExternalStore } from "react";
import { useEnApp } from "@/components/EnApp";
import { useAvisosWeb } from "@/lib/useAvisosWeb";

const DIAS_SILENCIO = 30;
const sinSuscripcion = () => () => {};

function cerradaHace(clave: string): boolean {
  try {
    const t = Number(localStorage.getItem(`oferta-avisos:${clave}`) ?? 0);
    return Date.now() - t < DIAS_SILENCIO * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * "🔔 ¿Te avisamos…?" en el momento justo (17-oct, pedido del dueño): solo
 * había 2 dispositivos con avisos porque únicamente se podían activar en
 * /perfil. Sale solo si este navegador puede activarlos y no los tiene; si
 * se cierra, no vuelve en 30 días. Dentro de la app no sale (allí los
 * avisos son nativos).
 */
export default function OfertaAvisos({ clave, texto }: { clave: string; texto: string }) {
  const enApp = useEnApp();
  const { estado, trabajando, error, encender } = useAvisosWeb();
  const cerradaAntes = useSyncExternalStore(sinSuscripcion, () => cerradaHace(clave), () => true);
  const [cerrada, setCerrada] = useState(false);
  const [pulsado, setPulsado] = useState(false);

  if (enApp || cerradaAntes || cerrada) return null;
  if (estado === "encendido") {
    return pulsado ? (
      <p className="oferta-avisos oferta-avisos--ok">✓ Avisos activados en este dispositivo.</p>
    ) : null;
  }
  if (estado !== "apagado") return null;

  const cerrar = () => {
    try {
      localStorage.setItem(`oferta-avisos:${clave}`, String(Date.now()));
    } catch {
      // Sin almacenamiento: se cierra solo esta vez.
    }
    setCerrada(true);
  };

  return (
    <div className="oferta-avisos">
      <Icono icono={Bell} tono="oro" tam="sm" />
      <span className="oferta-avisos__texto">{texto}</span>
      <button
        type="button"
        className="btn btn--accent oferta-avisos__btn"
        disabled={trabajando}
        onClick={async () => {
          setPulsado(true);
          await encender();
        }}
      >
        {trabajando ? "Activando…" : "Activar"}
      </button>
      <button type="button" className="oferta-avisos__cerrar" onClick={cerrar} aria-label="No, gracias">
        ✕
      </button>
      {error && <span className="oferta-avisos__error">{error}</span>}
    </div>
  );
}
