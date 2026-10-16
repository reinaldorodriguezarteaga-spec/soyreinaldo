"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { elegirMiEquipo } from "@/app/actions/mi-equipo";

/** Botones con los equipos favoritos para marcar el principal ("Mi equipo"). */
export default function MiEquipoElegir({
  equipos,
  actual,
}: {
  equipos: { id: number; name: string }[];
  actual?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const elegir = (id: number) =>
    startTransition(async () => {
      const r = await elegirMiEquipo(id);
      setError(!r.ok);
      if (r.ok) router.refresh();
    });

  return (
    <>
      <div className="miequipo__chips">
        {equipos.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`miequipo__chip${e.id === actual ? " on" : ""}`}
            onClick={() => elegir(e.id)}
            disabled={pending || e.id === actual}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://media.api-sports.io/football/teams/${e.id}.png`}
              alt=""
              width={22}
              height={22}
              loading="lazy"
            />
            {e.name}
          </button>
        ))}
      </div>
      {error && <p className="miequipo__sub">No se pudo guardar. Prueba otra vez.</p>}
    </>
  );
}
