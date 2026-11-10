import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Agrupa los cuatro | Juegos · Soy Reinaldo",
  description: "16 nombres del fútbol que hay que separar en 4 grupos de 4. ¿Qué tienen en común? Cuatro errores y se acabó.",
  alternates: { canonical: "/juegos/agrupa-los-cuatro" },
};

export default async function AgrupaPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Agrupa los cuatro
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Agrupa los cuatro
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            16 nombres, 4 grupos de 4. Elige cuatro que tengan algo en común y comprueba. Con cuatro errores, se acabó.
          </p>
          <Juego numero={numeroDelDia()} />
        </div>
      </section>
    </main>
  );
}
