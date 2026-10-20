"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { alternarLike, retirarPizarra } from "../acciones";

/** «Me gusta» (con cuenta) y quitar: el autor la borra, el admin la oculta. */
export function BotonLike({
  id,
  likes,
  leGusta,
  conectado,
}: {
  id: string;
  likes: number;
  leGusta: boolean;
  conectado: boolean;
}) {
  const [estado, setEstado] = useState({ likes, leGusta });
  const [pendiente, empezar] = useTransition();
  if (!conectado) {
    return (
      <Link href="/login?redirect=%2Fpizarra%2Fcomunidad" className="pzc-like" title="Inicia sesión para dar me gusta">
        ♡ {likes}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={`pzc-like${estado.leGusta ? " on" : ""}`}
      aria-pressed={estado.leGusta}
      disabled={pendiente}
      onClick={() => {
        const antes = estado;
        // Al momento; si falla, se deshace.
        setEstado({ likes: antes.likes + (antes.leGusta ? -1 : 1), leGusta: !antes.leGusta });
        empezar(async () => {
          const r = await alternarLike(id);
          if (!r.ok) setEstado(antes);
        });
      }}
    >
      {estado.leGusta ? "♥" : "♡"} {estado.likes}
    </button>
  );
}

export function BotonRetirar({ id, comoAdmin }: { id: string; comoAdmin: boolean }) {
  const [pendiente, empezar] = useTransition();
  const [hecho, setHecho] = useState(false);
  if (hecho) return <span className="pzc-retirada">{comoAdmin ? "Oculta" : "Borrada"}</span>;
  return (
    <button
      type="button"
      className="pzc-retirar"
      disabled={pendiente}
      onClick={() => {
        if (!window.confirm(comoAdmin ? "¿Ocultar esta pizarra de la galería?" : "¿Borrar tu pizarra?")) return;
        empezar(async () => {
          const r = await retirarPizarra(id, comoAdmin);
          if (r.ok) setHecho(true);
        });
      }}
    >
      {comoAdmin ? "Ocultar" : "Borrar"}
    </button>
  );
}
