import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Escudo borroso | Juegos · Soy Reinaldo",
  description: "Un escudo de fútbol muy borroso que se aclara con cada fallo. ¿De qué equipo es? Seis intentos, reto diario y práctica.",
  alternates: { canonical: "/juegos/escudo-borroso" },
};

export default async function EscudoPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Escudo borroso
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Escudo borroso
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Un escudo muy borroso que se aclara con cada fallo. ¿De qué equipo es? Tienes seis intentos.
          </p>
          <Juego numero={numeroDelDia()} />
        </div>
      </section>
    </main>
  );
}
