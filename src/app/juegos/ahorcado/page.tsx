import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import { ahorcadoDelDia, totalAhorcado } from "@/lib/juegos/ahorcado";
import Juego from "./juego";
import ComoSeJuega from "@/components/juegos/ComoSeJuega";

export const metadata: Metadata = {
  title: "Ahorcado de futbolistas | Juegos · Soy Reinaldo",
  description:
    "Adivina al futbolista letra a letra sabiendo solo en qué liga juega. Cinco fallos y estás ahorcado. Jugadores de LaLiga, la Premier y los grandes de la Champions.",
  alternates: { canonical: "/juegos/ahorcado" },
};

export default async function AhorcadoPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  const numero = numeroDelDia();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Ahorcado
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Ahorcado
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Un futbolista de hoy y la liga en la que juega. Pide letras: cada fallo es una parte del cuerpo y al quinto
            estás ahorcado. {totalAhorcado()} jugadores de LaLiga, la Premier y los grandes de la Champions.
          </p>
          <Juego numero={numero} delDia={ahorcadoDelDia(numero)} />
          <ComoSeJuega juego="ahorcado" nombre="Ahorcado" />
        </div>
      </section>
    </main>
  );
}
