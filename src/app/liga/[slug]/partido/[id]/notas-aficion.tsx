"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { guardarNotas } from "./acciones-notas";

export type EquipoNotas = {
  id: number;
  nombre: string;
  escudo: string;
  jugadores: { id: number; nombre: string; foto: string | null; nota: number | null }[];
};

const color = (n: number) => (n >= 7.5 ? "#4ade80" : n >= 6.5 ? "var(--text)" : "#ff8a8a");

export default function NotasAficion({
  fixtureId,
  equipos,
  medias,
  mias,
  abierto,
  conSesion,
}: {
  fixtureId: number;
  equipos: EquipoNotas[];
  medias: Record<number, { media: number; votos: number }>;
  mias: Record<number, number>;
  abierto: boolean;
  conSesion: boolean;
}) {
  const [lado, setLado] = useState(0);
  const [notas, setNotas] = useState<Record<number, number>>(mias);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, empezar] = useTransition();
  const equipo = equipos[lado];
  const puedeVotar = abierto && conSesion;
  const cambiadas = Object.keys(notas).some((id) => notas[Number(id)] !== mias[Number(id)]);

  return (
    <div className="panel na">
      <div className="na-tabs" role="tablist">
        {equipos.map((e, i) => (
          <button key={e.id} type="button" role="tab" aria-selected={i === lado} className={i === lado ? "is-on" : ""} onClick={() => setLado(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- escudo de la CDN de la API */}
            <img src={e.escudo} alt="" width={20} height={20} /> {e.nombre}
          </button>
        ))}
      </div>
      <div className="na-cab">
        <span />
        <span title="Nota de la API">API</span>
        <span title="Media de la afición">Afición</span>
        {puedeVotar && <span>Tu nota</span>}
      </div>
      <ul className="na-lista">
        {equipo.jugadores.map((j) => {
          const m = medias[j.id];
          return (
            <li key={j.id} className={puedeVotar ? "" : "na-sin-voto"}>
              <span className="na-jug">
                {j.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API
                  <img src={j.foto} alt="" width={28} height={28} loading="lazy" />
                ) : (
                  <span className="na-jug__sin" />
                )}
                <span className="na-jug__n">{j.nombre}</span>
              </span>
              <span className="na-num" style={{ color: j.nota != null ? color(j.nota) : undefined }}>
                {j.nota != null ? j.nota.toFixed(1) : "–"}
              </span>
              <span className="na-num" style={{ color: m ? color(m.media) : undefined }}>
                {m ? m.media.toFixed(1) : "–"}
                {m && <small>{m.votos}</small>}
              </span>
              {puedeVotar && (
                <select
                  aria-label={`Tu nota a ${j.nombre}`}
                  value={notas[j.id] ?? ""}
                  onChange={(e) => {
                    setMensaje(null);
                    const v = Number(e.target.value);
                    setNotas((n) => {
                      const c = { ...n };
                      if (v) c[j.id] = v;
                      else delete c[j.id];
                      return c;
                    });
                  }}
                >
                  <option value="">—</option>
                  {Array.from({ length: 10 }, (_, k) => 10 - k).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>
      {abierto && !conSesion && (
        <p className="pz-ayuda">
          <Link href="/login">Entra</Link> para poner tus notas.
        </p>
      )}
      {puedeVotar && (
        <div className="ao-pie" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn--accent"
            disabled={guardando || !cambiadas}
            onClick={() =>
              empezar(async () => {
                const r = await guardarNotas(fixtureId, notas);
                setMensaje(r.ok ? { ok: true, texto: "¡Notas guardadas! La media se actualiza en un momento." } : { ok: false, texto: r.error });
              })
            }
          >
            {guardando ? "Guardando…" : "Guardar mis notas"}
          </button>
          {mensaje && <span className={mensaje.ok ? "ao-ok" : "jg-aviso"}>{mensaje.texto}</span>}
        </div>
      )}
    </div>
  );
}
