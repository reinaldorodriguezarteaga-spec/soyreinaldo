import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Juegos de fútbol | Soy Reinaldo",
  description:
    "Juegos de fútbol para retar a tus amigos: adivina el equipo por las banderas de su once y más retos que llegan pronto.",
  alternates: { canonical: "/juegos" },
};

/** Pestaña de juegos (21-oct, pedido del dueño): aquí van todos. */
const JUEGOS = [
  {
    href: "/juegos/adivina-el-equipo",
    emoji: "🏳️",
    titulo: "Adivina el equipo",
    texto: "Un once histórico solo con banderas. Reto diario y práctica en tres dificultades.",
    listo: true,
  },
  {
    href: "/juegos/adivina-el-jugador",
    emoji: "🕵️",
    titulo: "Adivina el jugador",
    texto: "Los clubes por los que pasó, en orden. ¿Sabes quién es? Reto diario y práctica.",
    listo: true,
  },
  {
    href: "/juegos/tiki-taka-toe",
    emoji: "#️⃣",
    titulo: "Tiki-taka-toe",
    texto: "El tres en raya del fútbol: jugadores que pasaron por los dos clubes de cada casilla.",
    listo: true,
  },
  {
    href: "/juegos/adivina-el-once",
    emoji: "📋",
    titulo: "Adivina el once",
    texto: "Antes de cada partido del Barça, apuesta el once titular y suma puntos por cada acierto.",
    listo: true,
  },
] as const;

export default function JuegosPage() {
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">Juegos</p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Juegos
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 22px", maxWidth: 640 }}>
            Retos de fútbol para jugar cada día y picar a tus amigos.
          </p>
          <div className="jg-hub">
            {JUEGOS.map((j) =>
              j.listo ? (
                <Link key={j.titulo} href={j.href} className="jg-tarjeta panel">
                  <span className="jg-tarjeta__emoji" aria-hidden>
                    {j.emoji}
                  </span>
                  <b>{j.titulo}</b>
                  <span>{j.texto}</span>
                  <span className="jg-tarjeta__ir">Jugar →</span>
                </Link>
              ) : (
                <div key={j.titulo} className="jg-tarjeta panel is-pronto">
                  <span className="jg-tarjeta__emoji" aria-hidden>
                    {j.emoji}
                  </span>
                  <b>{j.titulo}</b>
                  <span>{j.texto}</span>
                  <span className="jg-tarjeta__ir">Muy pronto</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
