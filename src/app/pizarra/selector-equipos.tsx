"use client";

import { useRouter } from "next/navigation";
import type { GrupoEquipos } from "@/lib/pizarra/equipos";

/** Local y visitante, agrupados por liga. Cambiar uno recarga la pizarra
 * con sus plantillas (los equipos viajan en la URL). */
export default function SelectorEquipos({
  grupos,
  local,
  visitante,
}: {
  grupos: GrupoEquipos[];
  local: number | null;
  visitante: number | null;
}) {
  const router = useRouter();
  const ir = (l: number | null, v: number | null) => {
    const q = new URLSearchParams();
    if (l) q.set("local", String(l));
    if (v) q.set("visitante", String(v));
    const s = q.toString();
    router.push(s ? `/pizarra?${s}` : "/pizarra", { scroll: false });
  };

  const select = (valor: number | null, alCambiar: (id: number | null) => void, etiqueta: string) => (
    <label className="pz-sel">
      <span className="mono">{etiqueta}</span>
      <select value={valor ?? ""} onChange={(e) => alCambiar(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Elige equipo…</option>
        {grupos.map((g) => (
          <optgroup key={g.liga} label={g.nombre}>
            {g.equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );

  return (
    <div className="pz-selector">
      {select(local, (id) => ir(id, visitante), "Local")}
      <span className="mono pz-vs">VS</span>
      {select(visitante, (id) => ir(local, id), "Visitante")}
    </div>
  );
}
