import type { Metadata } from "next";
import Link from "next/link";
import Analizador from "./analizador";

export const metadata: Metadata = {
  title: "Analiza tu jugada: marca fotos del partido | Soy Reinaldo",
  description:
    "Sube capturas de una jugada y márcalas como en la tele: flechas, círculos, zonas, rayas, pincel y texto. Varias fotos a la vez y sin subir nada a ningún servidor.",
  alternates: { canonical: "/pizarra/fotos" },
};

export default function AnalizaFotosPage() {
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/pizarra">Pizarra</Link> · Analiza tu jugada
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Analiza tu jugada
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 18px", maxWidth: 680 }}>
            Sube una o varias fotos de la jugada real y márcalas como en la tele: flechas, círculos, zonas, rayas, pincel y
            texto. Pasa de una a otra con la tira de abajo y guárdalas cuando acabes.
          </p>
          <Analizador />
        </div>
      </section>
    </main>
  );
}
