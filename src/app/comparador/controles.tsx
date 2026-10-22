"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buscarJugadores, type Sugerencia } from "./acciones";
import { edadEnTemporada, nombreTemporada, type CompeticionJugador } from "@/lib/comparador/datos";

/** Selector de un lado: buscar jugador, temporada (o carrera) y competición.
 * Todo va a la URL (?a=&ta=&ca= / ?b=&tb=&cb=), así el enlace se comparte. */
export default function Controles({
  lado,
  temporadas,
  comps,
  t,
  c,
  nacido,
}: {
  lado: "a" | "b";
  temporadas: number[];
  comps: CompeticionJugador[];
  t: "carrera" | number;
  c: string[];
  /** Año de nacimiento: para el selector de edad («Messi a los 18»). */
  nacido: number | null;
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
            {nacido ? ` · ${edadEnTemporada(s, nacido)} años` : ""}
          </option>
        ))}
      </select>
      {nacido && (
        <select
          aria-label="Edad"
          value={t === "carrera" ? "" : String(edadEnTemporada(t, nacido))}
          onChange={(e) => e.target.value && ir({ [`t${lado}`]: String(nacido + Number(e.target.value)), [`c${lado}`]: null })}
        >
          <option value="">Por edad…</option>
          {[...temporadas].reverse().map((s) => (
            <option key={s} value={edadEnTemporada(s, nacido)}>
              Con {edadEnTemporada(s, nacido)} años ({nombreTemporada(s)})
            </option>
          ))}
        </select>
      )}
      {/* Competiciones: varias a la vez (liga + Champions, liga + copa…). Sin
          ninguna elegida, cuentan todas. */}
      <div className="cmp-comps">
        {c.length === 0 ? (
          <span className="cmp-comp is-todas">Todas las competiciones</span>
        ) : (
          c.map((k) => (
            <span key={k} className="cmp-comp">
              {comps.find((x) => x.clave === k)?.nombre ?? k}
              <button
                type="button"
                aria-label="Quitar competición"
                onClick={() => ir({ [`c${lado}`]: c.filter((x) => x !== k).join(",") || null })}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      {comps.some((x) => !c.includes(x.clave)) && (
        <select
          aria-label="Añadir competición"
          value=""
          onChange={(e) => e.target.value && ir({ [`c${lado}`]: [...c, e.target.value].join(",") })}
        >
          <option value="">+ {c.length ? "Añadir otra competición" : "Solo algunas competiciones…"}</option>
          {comps
            .filter((x) => !c.includes(x.clave))
            .map((x) => (
              <option key={x.clave} value={x.clave}>
                {x.nombre}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
