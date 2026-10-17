"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cerrarEncuesta, votarEncuesta } from "@/app/actions/encuestas";

type Opcion = { id: string; texto: string };

/** Una encuesta: votar (con sesión) y ver los porcentajes al momento. */
export default function EncuestaCard({
  id,
  pregunta,
  opciones,
  votos,
  total,
  miVoto,
  cerrada,
  conSesion,
  esAdmin,
}: {
  id: string;
  pregunta: string;
  opciones: Opcion[];
  votos: Record<string, number>;
  total: number;
  miVoto: string | null;
  cerrada: boolean;
  conSesion: boolean;
  esAdmin: boolean;
}) {
  const ruta = usePathname() ?? "/";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Optimista: el voto propio se ve al momento, antes de que vuelva el servidor.
  const [elegida, setElegida] = useState<string | null>(miVoto);

  const cuenta = (o: string) => (votos[o] ?? 0) + (elegida === o && miVoto !== o ? 1 : 0) - (miVoto === o && elegida !== o ? 1 : 0);
  const totalVista = total + (elegida && !miVoto ? 1 : 0);
  const verResultados = !!elegida || cerrada || !conSesion;

  const votar = (o: string) => {
    if (!conSesion || cerrada || pending) return;
    setElegida(o);
    startTransition(async () => {
      const r = await votarEncuesta(id, o, ruta);
      if (!r.ok) {
        setError(r.mensaje);
        setElegida(miVoto);
      } else {
        setError(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="panel encuesta">
      <p className="encuesta__pregunta">{pregunta}</p>
      <div className="encuesta__opciones">
        {opciones.map((o) => {
          const n = cuenta(o.id);
          const pct = totalVista > 0 ? Math.round((n / totalVista) * 100) : 0;
          return (
            <button
              key={o.id}
              type="button"
              className={`encuesta__op${elegida === o.id ? " on" : ""}`}
              onClick={() => votar(o.id)}
              disabled={!conSesion || cerrada || pending}
              aria-pressed={elegida === o.id}
            >
              {verResultados && <span className="encuesta__barra" style={{ width: `${pct}%` }} />}
              <span className="encuesta__texto">{o.texto}</span>
              {verResultados && <span className="mono encuesta__pct">{pct}%</span>}
            </button>
          );
        })}
      </div>
      <p className="encuesta__pie mono">
        {totalVista} {totalVista === 1 ? "voto" : "votos"}
        {cerrada && " · cerrada"}
        {!conSesion && !cerrada && (
          <>
            {" · "}
            <Link href={`/login?redirect=${encodeURIComponent(ruta)}`}>Inicia sesión para votar</Link>
          </>
        )}
        {esAdmin && !cerrada && (
          <button
            type="button"
            className="encuesta__cerrar"
            onClick={() => startTransition(async () => { await cerrarEncuesta(id, ruta); router.refresh(); })}
          >
            Cerrar
          </button>
        )}
      </p>
      {error && <p className="encuesta__error">{error}</p>}
    </div>
  );
}
