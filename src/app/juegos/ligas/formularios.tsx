"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { crearLiga, salirLiga, unirseLiga } from "./acciones";

/** Formularios de las ligas de los juegos (crear, unirse, invitar, salir). */

export function CrearLiga() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <form
      className="jg-ligas__form"
      onSubmit={(e) => {
        e.preventDefault();
        empezar(async () => {
          const r = await crearLiga(nombre);
          if (r.ok) router.push(`/juegos/ligas/${r.id}`);
          else setError(r.error);
        });
      }}
    >
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Los del grupo de fútbol" aria-label="Nombre de la liga" />
      <button type="submit" className="btn btn--accent" disabled={pendiente || nombre.trim().length < 2}>
        {pendiente ? "Creando…" : "Crear"}
      </button>
      {error && <p className="jg-ligas__aviso is-error">{error}</p>}
    </form>
  );
}

export function UnirseLiga({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <form
      className="jg-ligas__form"
      onSubmit={(e) => {
        e.preventDefault();
        empezar(async () => {
          const r = await unirseLiga(codigo);
          if (r.ok) router.push(`/juegos/ligas/${r.id}`);
          else setError(r.error);
        });
      }}
    >
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
        placeholder="ABC234"
        aria-label="Código de la liga"
        autoCapitalize="characters"
        style={{ letterSpacing: 3, fontFamily: "ui-monospace, monospace" }}
      />
      <button type="submit" className="btn btn--accent" disabled={pendiente || codigo.length !== 6}>
        {pendiente ? "Entrando…" : "Unirme"}
      </button>
      {error && <p className="jg-ligas__aviso is-error">{error}</p>}
    </form>
  );
}

export function InvitarLiga({ nombre, codigo }: { nombre: string; codigo: string }) {
  const [hecho, setHecho] = useState(false);
  const url = `https://www.soyreinaldo.com/juegos/ligas?c=${codigo}`;
  const texto = `Únete a mi liga «${nombre}» de los juegos de fútbol de Soy Reinaldo (código ${codigo}) 🎮`;
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          if (typeof navigator.share === "function") await navigator.share({ text: texto, url });
          else {
            await navigator.clipboard.writeText(`${texto} ${url}`);
            setHecho(true);
          }
        } catch {
          // Compartir cancelado.
        }
      }}
    >
      {hecho ? "✓ Enlace copiado" : "Invitar"}
    </button>
  );
}

export function SalirLiga({ id }: { id: string }) {
  const router = useRouter();
  const [seguro, setSeguro] = useState(false);
  const [pendiente, empezar] = useTransition();
  return seguro ? (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span className="jg-ligas__aviso">¿Salir de la liga?</span>
      <button
        type="button"
        className="btn"
        disabled={pendiente}
        onClick={() =>
          empezar(async () => {
            await salirLiga(id);
            router.push("/juegos/ligas");
          })
        }
      >
        Sí, salir
      </button>
      <button type="button" className="btn" onClick={() => setSeguro(false)}>
        No
      </button>
    </span>
  ) : (
    <button type="button" className="btn" onClick={() => setSeguro(true)}>
      Salir de la liga
    </button>
  );
}
