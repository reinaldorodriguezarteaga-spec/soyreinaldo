"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

/**
 * «Seguir en la pantalla de bloqueo» (actividad en directo, app 1.2, iOS 18+).
 * Solo se pinta dentro de la app, con el plugin nuevo y con el partido en
 * juego. Pide a la web el canal del partido (/api/actividad/partido) y la app
 * enciende la actividad, que desde ahí se actualiza sola en cada cambio.
 */
type Plugin = {
  iniciarActividad?: (o: { canal: string; atributos: unknown; estado: unknown }) => Promise<{ ok: boolean }>;
  actividadesDisponibles?: () => Promise<{ disponible: boolean }>;
};
type CapacitorGlobal = { isPluginAvailable?: (n: string) => boolean; Plugins?: Record<string, unknown> };

function plugin(): Plugin | null {
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap?.isPluginAvailable?.("WidgetPuente")) return null;
  const p = cap.Plugins?.WidgetPuente as Plugin | undefined;
  return p?.iniciarActividad && p.actividadesDisponibles ? p : null;
}

export default function SeguirBloqueo({ fixtureId, enJuego }: { fixtureId: number; enJuego: boolean }) {
  const [visible, setVisible] = useState(false);
  const [estado, setEstado] = useState<"listo" | "trabajando" | "hecho" | "error">("listo");

  useEffect(() => {
    if (!enJuego) return;
    const p = plugin();
    p?.actividadesDisponibles?.()
      .then((r) => setVisible(r.disponible))
      .catch(() => {});
  }, [enJuego]);

  if (!visible) return null;

  async function seguir() {
    const p = plugin();
    if (!p?.iniciarActividad) return;
    setEstado("trabajando");
    try {
      const r = await fetch(`/api/actividad/partido?id=${fixtureId}`);
      if (!r.ok) throw new Error();
      const datos = (await r.json()) as { canal: string; atributos: unknown; estado: unknown };
      const res = await p.iniciarActividad(datos);
      setEstado(res.ok ? "hecho" : "error");
    } catch {
      setEstado("error");
    }
  }

  return (
    <div className="seguir-bloqueo">
      {estado === "hecho" ? (
        <span>✓ En tu pantalla de bloqueo. Se actualiza sola en cada gol.</span>
      ) : (
        <button type="button" className="btn btn--accent" onClick={seguir} disabled={estado === "trabajando"}>
          <Lock className="ico-txt" aria-hidden /> {estado === "trabajando" ? "Activando…" : "Seguir en la pantalla de bloqueo"}
        </button>
      )}
      {estado === "error" && <p>No se pudo activar. Revisa que las Actividades en directo estén permitidas en Ajustes › Soy Reinaldo.</p>}
    </div>
  );
}
