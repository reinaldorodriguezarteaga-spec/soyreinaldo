import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { numeroDelDia } from "@/lib/juegos/diario";
import { JUGADORES_MISTERIOSO, misteriosoDelDia } from "@/lib/juegos/misterioso";
import Juego from "./juego";
import ComoSeJuega from "@/components/juegos/ComoSeJuega";

export const metadata: Metadata = {
  title: "Futbolista misterioso | Juegos · Soy Reinaldo",
  description:
    "Adivina al futbolista del día: escribe cualquier jugador y te decimos en qué se parece al misterioso (liga, equipo, posición, país, edad y dorsal). Ocho intentos.",
  alternates: { canonical: "/juegos/futbolista-misterioso" },
};

export default async function MisteriosoPage() {
  // El reto cambia cada día: la página no puede quedarse prerenderizada.
  await connection();
  const numero = numeroDelDia();
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/juegos">Juegos</Link> · Futbolista misterioso
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Futbolista misterioso
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 640 }}>
            Escribe cualquier jugador y te decimos en qué se parece al misterioso: liga, equipo, posición, país, edad y
            dorsal. Verde si coincide, amarillo si está cerca. Tienes ocho intentos.
          </p>
          <Juego numero={numero} objetivoDia={misteriosoDelDia(numero)} jugadores={JUGADORES_MISTERIOSO} />
          <ComoSeJuega juego="futbolista-misterioso" nombre="Futbolista misterioso" />
        </div>
      </section>
    </main>
  );
}
