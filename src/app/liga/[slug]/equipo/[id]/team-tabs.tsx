"use client";

import { useState } from "react";

/**
 * Pestañas de la ficha de equipo: "Partidos" (stats + calendario),
 * "Jugadores" (plantilla) y "Clasificación" (tabla de la competición, con
 * este equipo resaltado — se OCULTA si la competición no tiene tabla, p.ej.
 * Copa del Rey). Adaptado de `mundial/equipo/[id]/team-tabs.tsx` (que sigue
 * intacto, sin esta pestaña: el Mundial se clasifica por grupos, no por
 * `StandingsTableView`) — copiado a su propio archivo para que /mundial no
 * se vea afectado.
 */
export default function TeamTabs({
  partidos,
  jugadores,
  clasificacion,
  hasSquad,
}: {
  partidos: React.ReactNode;
  jugadores: React.ReactNode;
  /** `undefined` si la competición no tiene tabla (standingsMode "none") —
   * entonces no se enseña la pestaña. */
  clasificacion?: React.ReactNode;
  hasSquad: boolean;
}) {
  const [tab, setTab] = useState<"partidos" | "jugadores" | "clasificacion">("partidos");

  if (!hasSquad) return <>{partidos}</>;

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 24, maxWidth: clasificacion ? 460 : 320 }}>
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
        {clasificacion && (
          <button
            type="button"
            className={tab === "clasificacion" ? "on" : ""}
            onClick={() => setTab("clasificacion")}
          >
            Clasificación
          </button>
        )}
      </div>
      <div hidden={tab !== "partidos"}>{partidos}</div>
      <div hidden={tab !== "jugadores"}>{jugadores}</div>
      {clasificacion && <div hidden={tab !== "clasificacion"}>{clasificacion}</div>}
    </div>
  );
}
