import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CompartirImagen from "@/components/CompartirImagen";
import { cargarLado, peticionDe, type Lado } from "@/lib/comparador/cargar";
import { filas, formatear } from "@/lib/comparador/datos";
import Controles from "./controles";

type SP = { a?: string; b?: string; ta?: string; tb?: string; ca?: string; cb?: string };

/** Por defecto, Messi contra Cristiano en toda la carrera. */
const POR_DEFECTO = { a: "154", b: "874" };

async function lados(sp: SP): Promise<[Lado | null, Lado | null]> {
  const pa = peticionDe(sp.a ?? POR_DEFECTO.a, sp.ta, sp.ca);
  const pb = peticionDe(sp.b ?? POR_DEFECTO.b, sp.tb, sp.cb);
  return Promise.all([pa ? cargarLado(pa) : null, pb ? cargarLado(pb) : null]);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const [a, b] = await lados(sp);
  const titulo = a && b ? `${a.nombre} vs ${b.nombre} · Comparador de jugadores` : "Comparador de jugadores";
  const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
  const imagen = `/comparador/imagen?${q}`;
  return {
    title: `${titulo} | Soy Reinaldo`,
    description: "Compara a dos jugadores como quieras: por temporada, por competición o en toda su carrera. Goles, asistencias, regates, valoración y mucho más.",
    alternates: { canonical: "/comparador" },
    openGraph: { title: titulo, images: [{ url: imagen, width: 1080, height: 1350 }] },
  };
}

/**
 * Comparador de jugadores (22-oct, pedido del dueño): al estilo de Messi vs
 * Cristiano, pero con quien quieras y como quieras (temporada, competición,
 * carrera entera). Datos de API-Football, cacheados (las temporadas pasadas,
 * un mes); el buscador sale de las plantillas guardadas.
 */
export default async function ComparadorPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [a, b] = await lados(sp);
  const fs = a && b ? filas(a.totales, b.totales) : [];
  const q = new URLSearchParams(Object.entries({ ...POR_DEFECTO, ...sp }).filter(([, v]) => typeof v === "string") as [string, string][]);

  const cabeza = (l: Lado | null, lado: "a" | "b") => (
    <div className={`cmp-jug cmp-jug--${lado}`}>
      {l ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- foto de la CDN de la API */}
          <img src={l.foto} alt="" width={96} height={96} className="cmp-jug__foto" />
          <b className="cmp-jug__nombre">{l.nombre}</b>
          <span className="cmp-jug__ambito">{l.etiqueta}</span>
        </>
      ) : (
        <span className="pz-ayuda">Jugador no disponible: busca otro.</span>
      )}
      <Suspense fallback={null}>
        <Controles lado={lado} temporadas={l?.temporadas ?? []} comps={l?.comps ?? []} t={l?.t ?? "carrera"} c={l?.c ?? null} />
      </Suspense>
    </div>
  );

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            Análisis · <Link href="/messi-vs-ronaldo">Messi vs Cristiano →</Link>
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Comparador de jugadores
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 680 }}>
            Elige dos jugadores y compáralos como quieras: una temporada concreta, una competición o toda su carrera. Sin
            amistosos.
          </p>

          <div className="cmp">
            <div className="cmp-cab">
              {cabeza(a, "a")}
              <span className="cmp-vs">VS</span>
              {cabeza(b, "b")}
            </div>

            {a && b && (
              <>
                <ul className="cmp-filas">
                  {fs.map((f) => {
                    const va = f.a ?? 0;
                    const vb = f.b ?? 0;
                    const total = va + vb;
                    const gana = f.a == null || f.b == null || va === vb ? null : (va > vb) !== !!f.menosEsMejor ? "a" : "b";
                    return (
                      <li key={f.etiqueta}>
                        <span className={`cmp-v${gana === "a" ? " is-gana" : ""}`}>{formatear(f.a, f.formato)}</span>
                        <span className="cmp-et">
                          {f.etiqueta}
                          <span className="cmp-barra" aria-hidden>
                            <i className="cmp-barra__a" style={{ width: `${total ? (va / total) * 100 : 50}%` }} />
                            <i className="cmp-barra__b" style={{ width: `${total ? (vb / total) * 100 : 50}%` }} />
                          </span>
                        </span>
                        <span className={`cmp-v${gana === "b" ? " is-gana" : ""}`}>{formatear(f.b, f.formato)}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="cmp-compartir">
                  <CompartirImagen
                    imagen={`/comparador/imagen?${q}`}
                    nombreArchivo={`${a.nombre}-vs-${b.nombre}.png`.replace(/\s+/g, "-")}
                    url={`https://www.soyreinaldo.com/comparador?${q}`}
                    texto={`${a.nombre} vs ${b.nombre}`}
                  />
                </div>
                <p className="pz-ayuda">
                  Datos de API-Football. En temporadas antiguas faltan algunas estadísticas (asistencias, tiros…): salen
                  como «—». En una temporada también entran las competiciones de selecciones que el API apunta en ese
                  año (por ejemplo, el Mundial de 2014 en la 2014-15).
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
