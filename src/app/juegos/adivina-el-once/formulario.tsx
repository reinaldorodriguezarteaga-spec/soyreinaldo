"use client";

import { useState, useTransition } from "react";
import { guardarOnce } from "./acciones";

export type JugadorOnce = { id: number; nombre: string; dorsal: number | null; foto: string | null; grupo: "POR" | "DEF" | "MED" | "DEL" };

const GRUPOS = [
  ["POR", "Porteros"],
  ["DEF", "Defensas"],
  ["MED", "Centrocampistas"],
  ["DEL", "Delanteros"],
] as const;

/** Elegir formación y once titulares, y guardarlo (se puede cambiar hasta el cierre). */
export default function Formulario({
  fixture,
  plantilla,
  formaciones,
  inicial,
}: {
  fixture: number;
  plantilla: JugadorOnce[];
  formaciones: string[];
  inicial: { formacion: string; jugadores: number[] } | null;
}) {
  const [formacion, setFormacion] = useState(inicial?.formacion ?? "4-3-3");
  const [elegidos, setElegidos] = useState<number[]>(inicial?.jugadores ?? []);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, empezar] = useTransition();

  const alternar = (id: number) => {
    setMensaje(null);
    setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length >= 11 ? e : [...e, id]));
  };
  const porteros = elegidos.filter((id) => plantilla.find((j) => j.id === id)?.grupo === "POR").length;

  return (
    <div className="ao-form">
      <div className="ao-cab">
        <label>
          Formación{" "}
          <select value={formacion} onChange={(e) => setFormacion(e.target.value)}>
            {formaciones.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <span className={`ao-cuenta${elegidos.length === 11 ? " is-ok" : ""}`}>{elegidos.length}/11</span>
      </div>

      {GRUPOS.map(([g, titulo]) => {
        const del = plantilla.filter((j) => j.grupo === g);
        if (del.length === 0) return null;
        return (
          <div key={g} className="ao-grupo">
            <h3>{titulo}</h3>
            <div className="ao-lista">
              {del.map((j) => {
                const on = elegidos.includes(j.id);
                return (
                  <button
                    key={j.id}
                    type="button"
                    className={`ao-jug${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    disabled={!on && elegidos.length >= 11}
                    onClick={() => alternar(j.id)}
                  >
                    {j.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API
                      <img src={j.foto} alt="" width={32} height={32} loading="lazy" />
                    ) : (
                      <span className="ao-jug__sin" />
                    )}
                    <span className="ao-jug__n">{j.nombre}</span>
                    {j.dorsal != null && <span className="ao-jug__d">{j.dorsal}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {elegidos.length === 11 && porteros !== 1 && (
        <p className="jg-aviso">{porteros === 0 ? "Ojo: no has puesto portero." : "Ojo: llevas más de un portero."}</p>
      )}
      <div className="ao-pie">
        <button
          type="button"
          className="btn btn--accent"
          disabled={elegidos.length !== 11 || guardando}
          onClick={() =>
            empezar(async () => {
              const r = await guardarOnce({ fixture, formacion, jugadores: elegidos });
              setMensaje(r.ok ? { ok: true, texto: "¡Once guardado! Puedes cambiarlo hasta una hora antes." } : { ok: false, texto: r.error });
            })
          }
        >
          {guardando ? "Guardando…" : inicial ? "Actualizar mi once" : "Guardar mi once"}
        </button>
        {mensaje && <span className={mensaje.ok ? "ao-ok" : "jg-aviso"}>{mensaje.texto}</span>}
      </div>
    </div>
  );
}
