"use client";
import { CircleCheck, Swords } from "lucide-react";

import Link from "next/link";
import { useState, useTransition } from "react";
import { aceptarInvitacion } from "@/app/quiniela-liga/duelos-actions";

export default function AceptarInvitacion({
  ligaId,
  retadorId,
  jornada,
}: {
  ligaId: string;
  retadorId: string;
  jornada: number;
}) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<{ ok: boolean; mensaje?: string } | null>(null);

  if (estado?.ok) {
    return (
      <div className="logro__acciones">
        <p className="logro__detalle"><CircleCheck className="ico-txt" aria-hidden /> Reto aceptado. ¡Haz tus pronósticos de la jornada {jornada}!</p>
        <Link href="/quiniela-liga/partidos" className="btn btn--accent">
          Pronosticar <span className="arr">→</span>
        </Link>
      </div>
    );
  }
  return (
    <div className="logro__acciones">
      <button
        type="button"
        className="btn btn--accent"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await aceptarInvitacion(ligaId, retadorId);
            setEstado(r.ok ? { ok: true } : { ok: false, mensaje: r.mensaje });
          })
        }
      >
        {pending ? "Aceptando…" : <>Aceptar el reto <Swords className="ico-txt" aria-hidden /></>}
      </button>
      {estado && !estado.ok && <p className="duelo__error">{estado.mensaje}</p>}
    </div>
  );
}
