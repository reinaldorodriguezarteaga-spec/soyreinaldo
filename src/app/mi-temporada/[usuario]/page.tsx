import IconoMedalla from "@/components/IconoMedalla";
import { Flame, Target, CircleCheck, CalendarDays, Mic, Swords } from "lucide-react";

import type { Metadata } from "next";
import Icono from "@/components/Icono";
import Link from "next/link";
import { notFound } from "next/navigation";
import BotonCompartir from "@/components/BotonCompartir";
import { T } from "@/components/EnApp";
import { temporadaDe } from "@/lib/quiniela-liga/logros";

type P = { params: Promise<{ usuario: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const t = await temporadaDe(decodeURIComponent((await params).usuario));
  if (!t) return { title: "Temporada | Soy Reinaldo", robots: { index: false } };
  const title = `La temporada de ${t.nombre}: ${t.puntos} puntos${t.puesto ? `, ${t.puesto}º` : ""}`;
  return { title: `${title} | Soy Reinaldo`, robots: { index: false }, openGraph: { title } };
}

/**
 * "Tu temporada" (17-oct, pedido del dueño): el resumen estilo Wrapped de
 * un jugador en la liga pública, para compartir. Vale ya ("hasta ahora") y
 * al final de la temporada es el resumen completo.
 */
export default async function TemporadaPage({ params }: P) {
  const { usuario } = await params;
  const t = await temporadaDe(decodeURIComponent(usuario));
  if (!t) notFound();
  const url = `https://www.soyreinaldo.com/mi-temporada/${encodeURIComponent(usuario)}`;
  const datos: [import("lucide-react").LucideIcon, string, string][] = [
    [Flame, "Mejor jornada", t.mejor ? `${t.mejor.puntos} pts en la J${t.mejor.jornada}` : "—"],
    [Target, "Resultados exactos", String(t.exactos)],
    [CircleCheck, "Ganadores acertados", String(t.aciertos)],
    [CalendarDays, "Jornadas jugadas", String(t.jornadas)],
    [Swords, "Duelos", `${t.duelos.ganados} G · ${t.duelos.empatados} E · ${t.duelos.perdidos} P`],
    [Mic, "Le ganaste a Reinaldo", t.vsReinaldo.jugadas ? `${t.vsReinaldo.ganadas} de ${t.vsReinaldo.jugadas} jornadas` : "—"],
  ];

  return (
    <main className="page">
      <section className="section">
        <div className="wrap temporada">
          <div className="panel temporada__hero">
            <p className="mono logro__titulo"><T>Tu temporada · quiniela 2026-27</T></p>
            <h1 className="logro__nombre">{t.nombre}</h1>
            <div className="temporada__cifra">
              <strong>{t.puntos}</strong> puntos
            </div>
            {t.puesto && (
              <p className="logro__detalle">
                {t.puesto}º de {t.jugadores} en la clasificación general
              </p>
            )}
          </div>

          <div className="temporada__grid">
            {datos.map(([I, k, v]) => (
              <div key={k} className="panel temporada__dato">
                <Icono icono={I} tono="azul" />
                <span className="mono">{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>

          {t.victima && (
            <p className="panel temporada__frase">
              <Swords className="ico-txt" aria-hidden /> Tu víctima favorita: <strong>{t.victima.nombre}</strong> ({t.victima.veces}{" "}
              {t.victima.veces === 1 ? "duelo ganado" : "duelos ganados"}).
            </p>
          )}

          {t.medallas.length > 0 && (
            <div className="medallas" style={{ justifyContent: "center" }}>
              {t.medallas.map((m) => (
                <span key={m.clave} className="medalla" title={m.descripcion}>
                  <IconoMedalla clave={m.clave} /> {m.nombre}
                  {m.veces > 1 && <strong> ×{m.veces}</strong>}
                </span>
              ))}
            </div>
          )}

          <div className="logro__acciones">
            <BotonCompartir
              url={url}
              texto={`Mi temporada en los pronósticos de soyreinaldo.com: ${t.puntos} puntos${t.puesto ? ` y ${t.puesto}º de ${t.jugadores}` : ""}. ¿Me superas?`}
              etiqueta="Compartir mi temporada"
            />
            <Link href="/quiniela-liga/ranking" className="btn">
              Ver la clasificación <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
