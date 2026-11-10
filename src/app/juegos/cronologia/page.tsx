import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Cronología del fútbol | Juegos · Soy Reinaldo",
  description: "Cinco momentos del fútbol que hay que ordenar del más antiguo al más reciente. Tres intentos, reto diario y práctica.",
  alternates: { canonical: "/juegos/cronologia" },
};

export default async function CronologiaPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Cronología
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Cronología
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Ordena estos cinco momentos del más antiguo (arriba) al más reciente (abajo). Tienes tres intentos: después de
            cada uno te marcamos los que están en su sitio.
          </p>
          <Juego numero={numeroDelDia()} />
        </div>
      </section>
    </main>
  );
}
