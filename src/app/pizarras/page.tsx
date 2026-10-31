import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, Camera, ChevronRight, Globe, Presentation } from "lucide-react";
import Icono from "@/components/Icono";

export const metadata: Metadata = {
  title: "Pizarra táctica y herramientas | Soy Reinaldo",
  description:
    "Monta onces y anima jugadas en la pizarra táctica, analiza fotos del partido, mira las pizarras de la comunidad y compara jugadores.",
  alternates: { canonical: "/pizarras" },
};

/** Entrada de la pestaña «Pizarra» de la barra de abajo (31-oct): todas las herramientas, como /juegos. */
const HERRAMIENTAS = [
  {
    href: "/pizarra",
    corto: "Monta onces y anima jugadas",
    icono: Presentation,
    tono: "verde",
    titulo: "Pizarra táctica",
  },
  {
    href: "/pizarra/fotos",
    corto: "Flechas y zonas sobre fotos del partido",
    icono: Camera,
    tono: "naranja",
    titulo: "Analiza tu jugada",
  },
  {
    href: "/pizarra/comunidad",
    corto: "Las tácticas que ha publicado la gente",
    icono: Globe,
    tono: "azul",
    titulo: "Pizarras de la comunidad",
  },
  {
    href: "/comparador",
    corto: "Dos jugadores, cara a cara",
    icono: ArrowLeftRight,
    tono: "morado",
    titulo: "Comparador de jugadores",
  },
] as const;

export default function PizarrasPage() {
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap ios">
          <header className="ios__cab">
            <h1 className="ios__titulo">Pizarra</h1>
            <p className="ios__sub">Para explicar el partido a tu manera.</p>
          </header>
          <ul className="lista">
            {HERRAMIENTAS.map((h) => (
              <li key={h.href}>
                <Link href={h.href} className="lista__fila">
                  <Icono icono={h.icono} tono={h.tono} />
                  <span className="lista__txt">
                    <b>{h.titulo}</b>
                    <span>{h.corto}</span>
                  </span>
                  <ChevronRight className="lista__ir" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
