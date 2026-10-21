import type { Metadata } from "next";
import Link from "next/link";
import { jugadoresMasOMenos } from "@/lib/juegos/mas-o-menos";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "¿Más o menos? Goles y asistencias de esta temporada | Juegos · Soy Reinaldo",
  description:
    "Dos jugadores de las grandes ligas y una pregunta: ¿quién tiene más goles o asistencias esta temporada? A ver hasta dónde llega tu racha.",
  alternates: { canonical: "/juegos/mas-o-menos" },
};

export default async function MasOMenosPage() {
  const jugadores = await jugadoresMasOMenos();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · ¿Más o menos?
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            ¿Más o menos?
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            ¿Quién tiene más esta temporada en su liga? Elige y suma racha hasta que falles.
          </p>
          {jugadores.length < 10 ? (
            <div className="panel" style={{ padding: 24, color: "var(--text-dim)", textAlign: "center" }}>
              Ahora mismo no hay datos de la temporada. Prueba en un rato.
            </div>
          ) : (
            <Juego jugadores={jugadores} />
          )}
        </div>
      </section>
    </main>
  );
}
