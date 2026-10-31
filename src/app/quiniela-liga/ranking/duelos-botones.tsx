"use client";
import { Swords } from "lucide-react";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderDuelo, retar, retirarDuelo, type ResultadoDuelo } from "../duelos-actions";

function useAccion() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const correr = (fn: () => Promise<ResultadoDuelo>) =>
    startTransition(async () => {
      const r = await fn();
      setError(r.ok ? null : r.mensaje);
      if (r.ok) router.refresh();
    });
  return { pending, error, correr };
}

/** Aceptar / rechazar un reto recibido. */
export function ResponderReto({ id }: { id: string }) {
  const { pending, error, correr } = useAccion();
  return (
    <span className="duelo__acciones">
      <button type="button" className="btn btn--accent" disabled={pending} onClick={() => correr(() => responderDuelo(id, true))}>
        Aceptar <Swords className="ico-txt" aria-hidden />
      </button>
      <button type="button" className="btn" disabled={pending} onClick={() => correr(() => responderDuelo(id, false))}>
        Rechazar
      </button>
      {error && <span className="duelo__error">{error}</span>}
    </span>
  );
}

/** Retirar un reto enviado que aún nadie ha aceptado. */
export function RetirarReto({ id }: { id: string }) {
  const { pending, error, correr } = useAccion();
  return (
    <span className="duelo__acciones">
      <button type="button" className="btn" disabled={pending} onClick={() => correr(() => retirarDuelo(id))}>
        Retirar
      </button>
      {error && <span className="duelo__error">{error}</span>}
    </span>
  );
}

/** Elegir rival de la liga y lanzar el reto. */
export function FormRetar({
  leagueId,
  rivales,
  jornada,
}: {
  leagueId: string;
  rivales: { id: string; nombre: string }[];
  jornada: number;
}) {
  const { pending, error, correr } = useAccion();
  const [rival, setRival] = useState("");
  return (
    <form
      className="duelo__form"
      onSubmit={(e) => {
        e.preventDefault();
        if (rival) correr(() => retar(leagueId, rival));
      }}
    >
      <select className="field" value={rival} onChange={(e) => setRival(e.target.value)} aria-label="Rival">
        <option value="">Elige a quién retar…</option>
        {rivales.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nombre}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn--accent" disabled={pending || !rival}>
        Retar en la J{jornada} <Swords className="ico-txt" aria-hidden />
      </button>
      {error && <span className="duelo__error">{error}</span>}
    </form>
  );
}
