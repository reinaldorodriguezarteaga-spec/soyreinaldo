import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Once de leyenda: arma el mejor equipo de la historia | Juegos · Soy Reinaldo",
  description:
    "Once rondas, tres leyendas por puesto. Elige y descubre la media de tu once: Messi, Cruyff, Maldini, Zidane… ¿sabes quién era mejor?",
  alternates: { canonical: "/juegos/once-de-leyenda" },
};

export default async function OnceDeLeyendaPage() {
  // Las ternas del día cambian cada día: nada de prerender.
  await connection();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Once de leyenda
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Once de leyenda
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Once rondas, una por puesto, con tres leyendas a elegir. Las medias no se ven hasta el final: ¿sabes quién
            era mejor?
          </p>
          <Juego numero={numeroDelDia()} />
        </div>
      </section>
    </main>
  );
}
