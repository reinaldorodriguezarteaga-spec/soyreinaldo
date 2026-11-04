"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, ChevronDown, Flag } from "lucide-react";
import { ponerAvisosEquipo, type NivelAvisos } from "@/app/actions/favorites";

const OPCIONES: { valor: NivelAvisos; texto: string }[] = [
  { valor: "todo", texto: "Todo" },
  { valor: "final", texto: "Solo el final" },
  { valor: "nada", texto: "Sin avisos" },
];

/**
 * Qué avisos manda un equipo favorito (4-nov, pedido del dueño): hay quien lo
 * sigue minuto a minuto (inicio, goles y final) y quien lo quiere arriba solo
 * para saber cómo acabó.
 */
export default function AvisosEquipo({
  teamId,
  nombre,
  inicial,
}: {
  teamId: string;
  nombre: string;
  inicial: NivelAvisos;
}) {
  const [nivel, setNivel] = useState<NivelAvisos>(inicial);
  const [pendiente, start] = useTransition();
  const Ico = nivel === "nada" ? BellOff : nivel === "final" ? Flag : Bell;

  return (
    <label className={`fav-avisos${nivel === "nada" ? " is-off" : ""}`}>
      <Ico aria-hidden />
      <select
        value={nivel}
        disabled={pendiente}
        aria-label={`Avisos de ${nombre}`}
        onChange={(e) => {
          const antes = nivel;
          const nuevo = e.target.value as NivelAvisos;
          setNivel(nuevo);
          start(async () => {
            const r = await ponerAvisosEquipo(teamId, nuevo);
            if (!r.ok) setNivel(antes);
          });
        }}
      >
        {OPCIONES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      <ChevronDown className="fav-avisos__flecha" aria-hidden />
    </label>
  );
}
