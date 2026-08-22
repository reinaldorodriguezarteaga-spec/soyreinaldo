"use client";

import Image from "next/image";
import Link from "next/link";
import type { BusquedaUniversal } from "@/app/api/sports/search/route";
import { MINIMO_LETRAS } from "./use-busqueda";

/**
 * Lista de resultados de la búsqueda universal. La comparten la barra
 * desplegable del header y la página /buscar, para que se vean y se
 * comporten igual en los dos sitios.
 */
export default function ResultadosBusqueda({
  term,
  res,
  cargando,
  vacio,
  onNavegar,
  compacto = false,
}: {
  term: string;
  res: BusquedaUniversal;
  cargando: boolean;
  vacio: boolean;
  /** Se llama al pulsar un resultado (el header lo usa para cerrarse). */
  onNavegar?: () => void;
  /** Menos aire: para el desplegable del header. */
  compacto?: boolean;
}) {
  if (term.length < MINIMO_LETRAS) {
    return (
      <p className="srch__aviso">Escribe al menos {MINIMO_LETRAS} letras.</p>
    );
  }
  if (cargando) return <p className="srch__aviso">Buscando…</p>;
  if (vacio) return <p className="srch__aviso">Nada para “{term}”.</p>;

  return (
    <>
      {res.equipos.length > 0 && (
        <>
          <p className="srch__titulo">Equipos</p>
          {res.equipos.map((t) => (
            <Link
              key={t.id}
              href={`/liga/${t.slug}/equipo/${t.id}`}
              className="srch__fila"
              onClick={onNavegar}
            >
              <Image src={t.logo} alt="" width={compacto ? 22 : 26} height={compacto ? 22 : 26} unoptimized />
              <span className="srch__nombre truncate">{t.name}</span>
              {t.country && <span className="srch__meta">{t.country}</span>}
            </Link>
          ))}
        </>
      )}

      {res.jugadores.length > 0 && (
        <>
          <p className="srch__titulo">Jugadores</p>
          {res.jugadores.map((p) => (
            <Link
              key={p.id}
              href={`/jugador/${p.id}`}
              className="srch__fila"
              onClick={onNavegar}
            >
              {p.photo ? (
                <Image
                  src={p.photo}
                  alt=""
                  width={compacto ? 22 : 28}
                  height={compacto ? 22 : 28}
                  unoptimized
                  style={{ borderRadius: "50%", background: "var(--surface-2)" }}
                />
              ) : (
                <span
                  style={{
                    width: compacto ? 22 : 28,
                    height: compacto ? 22 : 28,
                    borderRadius: "50%",
                    background: "var(--surface-2)",
                  }}
                />
              )}
              <span className="srch__nombre truncate">{p.name}</span>
              {p.nationality && <span className="srch__meta">{p.nationality}</span>}
            </Link>
          ))}
        </>
      )}
    </>
  );
}
