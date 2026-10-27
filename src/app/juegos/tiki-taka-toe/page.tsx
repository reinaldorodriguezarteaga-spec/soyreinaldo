import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Tiki-taka-toe: el tres en raya del fútbol | Juegos · Soy Reinaldo",
  description:
    "Rellena el tablero con jugadores que pasaron por el club de la fila y el de la columna. Tablero nuevo cada día.",
  alternates: { canonical: "/juegos/tiki-taka-toe" },
};

export default async function TikiTakaToePage() {
  // El tablero cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Tiki-taka-toe
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Tiki-taka-toe
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            El tres en raya del fútbol: en cada casilla, un jugador que haya pasado por el club de su fila y el de su
            columna. Nueve intentos.
          </p>
          <Juego numero={numeroDelDia()} />
        </div>
      </section>
    </main>
  );
}
