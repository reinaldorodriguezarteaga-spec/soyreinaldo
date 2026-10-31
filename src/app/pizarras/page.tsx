import type { Metadata } from "next";
import Link from "next/link";

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
    emoji: "📋",
    titulo: "Pizarra táctica",
    texto: "Monta los onces, mueve a los jugadores y anima la jugada. Guárdala en la comunidad o compártela.",
    ir: "Abrir →",
  },
  {
    href: "/pizarra/fotos",
    emoji: "📸",
    titulo: "Analiza tu jugada",
    texto: "Marca flechas, zonas y jugadores sobre fotos y fotogramas del partido real.",
    ir: "Abrir →",
  },
  {
    href: "/pizarra/comunidad",
    emoji: "🌍",
    titulo: "Pizarras de la comunidad",
    texto: "Las tácticas que ha publicado la gente. Ábrelas, cópialas y haz la tuya.",
    ir: "Ver →",
  },
  {
    href: "/comparador",
    emoji: "⚖️",
    titulo: "Comparador de jugadores",
    texto: "Dos jugadores cara a cara: la temporada y la competición que quieras.",
    ir: "Comparar →",
  },
] as const;

export default function PizarrasPage() {
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">Pizarra</p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Pizarra
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 22px", maxWidth: 640 }}>
            Para explicar el partido a tu manera.
          </p>
          <div className="jg-hub">
            {HERRAMIENTAS.map((h) => (
              <Link key={h.href} href={h.href} className="jg-tarjeta panel">
                <span className="jg-tarjeta__emoji" aria-hidden>
                  {h.emoji}
                </span>
                <b>{h.titulo}</b>
                <span>{h.texto}</span>
                <span className="jg-tarjeta__ir">{h.ir}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
