import type { Metadata } from "next";
import Link from "next/link";
import ModoCarrera from "./juego";

export const metadata: Metadata = {
  title: "Modo carrera: de segunda división al Balón de Oro | Juegos · Soy Reinaldo",
  description:
    "Crea tu jugador con 17 años en un equipo de segunda y decide cada temporada. Goles, títulos, fichajes por el Madrid, el Barça o el City… ¿hasta dónde llegas?",
  alternates: { canonical: "/juegos/modo-carrera" },
};

/** Modo carrera (27-oct, pedido del dueño). */
export default function ModoCarreraPage() {
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Modo carrera
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Modo carrera
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Empiezas con 17 años en un equipo de segunda. Cada temporada eliges qué hacer, juegas y te llegan ofertas
            según tu rendimiento. ¿Llegarás al Madrid, al Barça o al City? ¿Cuándo colgarás las botas?
          </p>
          <ModoCarrera />
        </div>
      </section>
    </main>
  );
}
