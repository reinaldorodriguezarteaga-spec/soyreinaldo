import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import { equiposConListas, temporadasTop10, top10DelDia, totalListas } from "@/lib/juegos/top10";
import Juego from "./juego";

export const metadata: Metadata = {
  title: "Top 10: los que más jugaron, marcaron y asistieron | Juegos · Soy Reinaldo",
  description:
    "Los 10 jugadores con más minutos, goles o asistencias de los grandes de Europa. Solo ves la bandera: escribe sus nombres antes de que se acabe el tiempo.",
  alternates: { canonical: "/juegos/top-10" },
};

export default async function Top10Page() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  const numero = numeroDelDia();
  const { desde, hasta } = temporadasTop10();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Top 10
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Top 10
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Los diez que más jugaron, marcaron o asistieron en una temporada de un grande de Europa. Solo ves su bandera:
            escribe los nombres antes de que se acabe el tiempo. {totalListas()} listas, de la {desde} a la {hasta}.
          </p>
          <Juego numero={numero} delDia={top10DelDia(numero)} equipos={equiposConListas()} />
        </div>
      </section>
    </main>
  );
}
