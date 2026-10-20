"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EquipoPizarra, GrupoEquipos } from "@/lib/pizarra/equipos";

/**
 * Local y visitante. Cada uno es un buscador (20-oct, pedido del dueño: en
 * un desplegable de ~560 equipos costaba encontrar uno): se escribe y salen
 * los que coinciden, sin importar tildes; sin escribir, las ligas salen
 * plegadas y se abren con un toque. Cambiar un equipo recarga la pizarra con
 * sus plantillas (los equipos viajan en la URL).
 */
export default function SelectorEquipos({
  grupos,
  local,
  visitante,
}: {
  grupos: GrupoEquipos[];
  local: number | null;
  visitante: number | null;
}) {
  const router = useRouter();
  const ir = (l: number | null, v: number | null) => {
    const q = new URLSearchParams();
    if (l) q.set("local", String(l));
    if (v) q.set("visitante", String(v));
    const s = q.toString();
    router.push(s ? `/pizarra?${s}` : "/pizarra", { scroll: false });
  };
  const porId = new Map(grupos.flatMap((g) => g.equipos.map((e) => [e.id, e] as const)));

  return (
    <div className="pz-selector">
      <Buscador etiqueta="Local" grupos={grupos} elegido={local ? (porId.get(local) ?? null) : null} alElegir={(id) => ir(id, visitante)} />
      <span className="mono pz-vs">VS</span>
      <Buscador
        etiqueta="Visitante"
        grupos={grupos}
        elegido={visitante ? (porId.get(visitante) ?? null) : null}
        alElegir={(id) => ir(local, id)}
      />
    </div>
  );
}

const normal = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function Buscador({
  etiqueta,
  grupos,
  elegido,
  alElegir,
}: {
  etiqueta: string;
  grupos: GrupoEquipos[];
  elegido: EquipoPizarra | null;
  alElegir: (id: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [ligaAbierta, setLigaAbierta] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // Se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    entrada.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const q = normal(texto);
  const coincidencias = q
    ? grupos
        .flatMap((g) => g.equipos.map((e) => ({ e, liga: g.nombre })))
        .filter(({ e }) => normal(e.name).includes(q))
        // Primero los que empiezan por lo escrito ("bar" → Barcelona antes que Kilbarchan).
        .sort((a, b) => Number(normal(b.e.name).startsWith(q)) - Number(normal(a.e.name).startsWith(q)))
        .slice(0, 40)
    : [];

  const elegir = (id: number) => {
    setAbierto(false);
    setTexto("");
    alElegir(id);
  };

  const fila = (e: EquipoPizarra, liga?: string) => (
    <button key={e.id} type="button" className="pz-busca__eq" onClick={() => elegir(e.id)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={e.logo} alt="" width={20} height={20} loading="lazy" />
      <span>{e.name}</span>
      {liga && <small>{liga}</small>}
    </button>
  );

  return (
    <div className="pz-sel" ref={caja}>
      <span className="mono">{etiqueta}</span>
      <button type="button" className="pz-busca__boton" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        {elegido ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={elegido.logo} alt="" width={22} height={22} />
            <span>{elegido.name}</span>
          </>
        ) : (
          <span className="pz-busca__vacio">Elige equipo…</span>
        )}
        <span aria-hidden className="pz-busca__flecha">▾</span>
      </button>
      {abierto && (
        <div className="pz-busca__panel">
          <input
            ref={entrada}
            type="search"
            className="pz-busca__input"
            placeholder="Busca un equipo…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && coincidencias[0]) elegir(coincidencias[0].e.id);
            }}
            aria-label={`Buscar equipo ${etiqueta.toLowerCase()}`}
          />
          <div className="pz-busca__lista">
            {q ? (
              coincidencias.length ? (
                coincidencias.map(({ e, liga }) => fila(e, liga))
              ) : (
                <p className="pz-vacio">Ningún equipo con «{texto}».</p>
              )
            ) : (
              grupos.map((g) => (
                <div key={g.liga}>
                  <button
                    type="button"
                    className="pz-busca__liga"
                    aria-expanded={ligaAbierta === g.liga}
                    onClick={() => setLigaAbierta((l) => (l === g.liga ? null : g.liga))}
                  >
                    <span>{g.nombre}</span>
                    <small>{g.equipos.length}</small>
                    <span aria-hidden>{ligaAbierta === g.liga ? "▴" : "▾"}</span>
                  </button>
                  {ligaAbierta === g.liga && g.equipos.map((e) => fila(e))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
