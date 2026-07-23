"use client";

import { useState } from "react";

/**
 * Pestañas de la ficha de equipo: "Partidos" (stats + calendario) y
 * "Jugadores" (plantilla). Idéntico a `mundial/equipo/[id]/team-tabs.tsx`
 * (ya era competición-agnóstico) — copiado sin cambios a su propio archivo
 * para que /mundial quede intacto.
 */
export default function TeamTabs({
  partidos,
  jugadores,
  hasSquad,
}: {
  partidos: React.ReactNode;
  jugadores: React.ReactNode;
  hasSquad: boolean;
}) {
  const [tab, setTab] = useState<"partidos" | "jugadores">("partidos");

  if (!hasSquad) return <>{partidos}</>;

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 24, maxWidth: 320 }}>
        <button
          type="button"
          className={tab === "partidos" ? "on" : ""}
          onClick={() => setTab("partidos")}
        >
          Partidos
        </button>
        <button
          type="button"
          className={tab === "jugadores" ? "on" : ""}
          onClick={() => setTab("jugadores")}
        >
          Jugadores
        </button>
      </div>
      <div hidden={tab !== "partidos"}>{partidos}</div>
      <div hidden={tab !== "jugadores"}>{jugadores}</div>
    </div>
  );
}
