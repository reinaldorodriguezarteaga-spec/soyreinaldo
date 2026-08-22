"use client";

import { useState } from "react";
import ResultadosBusqueda from "@/components/search/resultados";
import { useBusqueda } from "@/components/search/use-busqueda";

/**
 * Buscador de la página /buscar. Comparte hook y lista de resultados con la
 * barra desplegable del header (`HeaderSearch`), así los dos buscan igual y
 * se ven igual; aquí solo cambia el envoltorio: campo grande y resultados en
 * la propia página en vez de en un desplegable.
 */
export default function UniversalSearch({ inicial = "" }: { inicial?: string }) {
  const [q, setQ] = useState(inicial);
  const { term, res, cargando, vacio } = useBusqueda(q);

  return (
    <div>
      <input
        type="search"
        className="field"
        placeholder="Busca cualquier equipo o jugador…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        style={{ width: "100%", fontSize: "1rem" }}
        aria-label="Buscar equipo o jugador"
      />
      <div className="panel" style={{ marginTop: 18, padding: 6, overflow: "hidden" }}>
        <ResultadosBusqueda term={term} res={res} cargando={cargando} vacio={vacio} />
      </div>
    </div>
  );
}
