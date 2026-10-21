import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Adivina el jugador por su carrera | Juegos · Soy Reinaldo",
  description:
    "Te enseñamos los clubes por los que pasó, en orden. ¿Sabes quién es? Reto diario y modo práctica con cracks de las grandes ligas.",
  alternates: { canonical: "/juegos/adivina-el-jugador" },
};

export default async function AdivinaElJugadorPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Adivina el jugador
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Adivina el jugador
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Estos son los clubes por los que pasó, en orden. Tienes cinco intentos y cada fallo te da una pista.
          </p>
          <Juego numero={numeroDelDia()} />
        </div>
      </section>
    </main>
  );
}
