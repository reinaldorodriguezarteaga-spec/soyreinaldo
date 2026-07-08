"use client";

import { useState } from "react";

/**
 * Pestañas de la ficha de equipo: "Partidos" (stats + calendario) y
 * "Jugadores" (plantilla). Ambos contenidos llegan ya renderizados desde el
 * server como nodos; aquí solo se alterna cuál se muestra.
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
