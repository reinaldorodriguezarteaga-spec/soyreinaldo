"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ELECCIONES, MARGEN, MINUTO_CIERRE, type Eleccion } from "@/lib/partido/siguiente-gol";
import { pronosticarSiguienteGol } from "./acciones-siguiente-gol";

export type Pronostico = { minuto: number; eleccion: Eleccion; resultado: Eleccion | null };

/** Botonera y marcador personal de «¿Quién marca el siguiente gol?». */
export default function SiguienteGol({
  fixtureId,
  local,
  visitante,
  abierto,
  conSesion,
  pronosticos,
  reparto,
}: {
  fixtureId: number;
  local: string;
  visitante: string;
  abierto: boolean;
  conSesion: boolean;
  pronosticos: Pronostico[];
  reparto: Partial<Record<Eleccion, number>>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const nombre: Record<Eleccion, string> = { local, visitante, nadie: "Nadie más" };
  const abiertoMio = pronosticos.find((p) => p.resultado == null);
  const resueltos = pronosticos.filter((p) => p.resultado != null);
  const aciertos = resueltos.filter((p) => p.resultado === p.eleccion).length;
  const totalVotos = ELECCIONES.reduce((s, e) => s + (reparto[e] ?? 0), 0);

  const votar = (e: Eleccion) =>
    empezar(async () => {
      setError(null);
      const r = await pronosticarSiguienteGol(fixtureId, e);
      if (!r.ok) setError(r.error);
      router.refresh();
    });

  return (
    <div className="sg panel">
      {abierto && (
        <>
          <div className="sg__opciones">
            {ELECCIONES.map((e) => {
              const pct = totalVotos ? Math.round(((reparto[e] ?? 0) / totalVotos) * 100) : null;
              const elegido = abiertoMio?.eleccion === e;
              return (
                <button
                  key={e}
                  type="button"
                  className={`sg__opcion${elegido ? " is-elegido" : ""}`}
                  disabled={pendiente || !conSesion || !!abiertoMio}
                  onClick={() => votar(e)}
                >
                  <b>{nombre[e]}</b>
                  {pct != null && <span>{pct}% de la afición</span>}
                </button>
              );
            })}
          </div>
          <p className="sg__nota">
            {!conSesion ? (
              <>
                <Link href="/login">Entra</Link> para jugar.{" "}
              </>
            ) : abiertoMio ? (
              <>
                Tu pronóstico: <b>{nombre[abiertoMio.eleccion]}</b> (minuto {abiertoMio.minuto}). Cuando haya gol, podrás
                volver a jugar.{" "}
              </>
            ) : null}
            Cuenta el primer gol que llegue al menos {MARGEN} minutos después de pronosticar; hasta el {MINUTO_CIERRE}&apos;.
          </p>
        </>
      )}
      {!abierto && abiertoMio && (
        <p className="sg__nota">
          Tu pronóstico: <b>{nombre[abiertoMio.eleccion]}</b> (minuto {abiertoMio.minuto}), pendiente del siguiente gol.
        </p>
      )}
      {resueltos.length > 0 && (
        <div className="sg__mios">
          <p className="sg__aciertos">
            <b>
              {aciertos}/{resueltos.length}
            </b>{" "}
            aciertos en este partido
          </p>
          <ul>
            {resueltos.map((p) => (
              <li key={p.minuto} className={p.resultado === p.eleccion ? "is-ok" : "is-mal"}>
                {p.resultado === p.eleccion ? "✓" : "✗"} {p.minuto}&apos;: {nombre[p.eleccion]}
                {p.resultado !== p.eleccion && <span> ({p.resultado === "nadie" ? "no hubo más goles" : `marcó el ${nombre[p.resultado!]}`})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="sg__nota is-error">{error}</p>}
    </div>
  );
}
