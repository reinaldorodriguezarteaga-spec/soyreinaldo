"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buscarJugadores, type Sugerencia } from "./acciones";
import { nombreTemporada, type CompeticionJugador } from "@/lib/comparador/datos";

/** Selector de un lado: buscar jugador, temporada (o carrera) y competición.
 * Todo va a la URL (?a=&ta=&ca= / ?b=&tb=&cb=), así el enlace se comparte. */
export default function Controles({
  lado,
  temporadas,
  comps,
  t,
  c,
}: {
  lado: "a" | "b";
  temporadas: number[];
  comps: CompeticionJugador[];
  t: "carrera" | number;
  c: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [sug, setSug] = useState<Sugerencia[]>([]);
  const [cargando, empezar] = useTransition();

  useEffect(() => {
    if (q.trim().length < 3) return;
    const id = setTimeout(() => {
      buscarJugadores(q)
        .then(setSug)
        .catch(() => setSug([]));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const ir = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    empezar(() => router.push(`/comparador?${p}`, { scroll: false }));
  };

  return (
    <div className={`cmp-ctl${cargando ? " is-cargando" : ""}`}>
      <div className="cmp-busca">
        <input
          type="search"
          placeholder="Cambiar jugador…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length < 3) setSug([]);
          }}
          aria-label="Buscar jugador"
        />
        {sug.length > 0 && (
          <ul className="cmp-sug">
            {sug.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setSug([]);
                    ir({ [lado]: String(s.id), [`t${lado}`]: null, [`c${lado}`]: null });
                  }}
                >
                  {s.foto && (
                    // eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API
                    <img src={s.foto} alt="" width={28} height={28} />
                  )}
                  {s.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <select
        aria-label="Temporada"
        value={String(t)}
        onChange={(e) => ir({ [`t${lado}`]: e.target.value === "carrera" ? null : e.target.value, [`c${lado}`]: null })}
      >
        <option value="carrera">Toda la carrera</option>
        {temporadas.map((s) => (
          <option key={s} value={s}>
            {nombreTemporada(s)}
          </option>
        ))}
      </select>
      <select aria-label="Competición" value={c ?? ""} onChange={(e) => ir({ [`c${lado}`]: e.target.value || null })}>
        <option value="">Todas las competiciones</option>
        {comps.map((x) => (
          <option key={x.clave} value={x.clave}>
            {x.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
