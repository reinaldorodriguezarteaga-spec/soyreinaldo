import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/adivina-equipo";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Adivina el equipo: el once con banderas | Juegos · Soy Reinaldo",
  description:
    "Un once histórico solo con las banderas de sus jugadores. ¿Sabes qué equipo es? Reto diario y modo práctica con tres niveles de dificultad.",
  alternates: { canonical: "/juegos/adivina-el-equipo" },
};

export default async function AdivinaElEquipoPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Adivina el equipo
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Adivina el equipo
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Un once que hizo historia, solo con las banderas de sus jugadores. Tienes cinco intentos y cada fallo te da
            una pista.
          </p>
          <Juego numero={numeroDelDia()} />
        </div>
      </section>
    </main>
  );
}
