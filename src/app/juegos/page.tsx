import type { Metadata } from "next";
import Link from "next/link";
import RachaJuegos from "@/components/juegos/RachaJuegos";

export const metadata: Metadata = {
  title: "Juegos de fútbol | Soy Reinaldo",
  description:
    "Juegos de fútbol diarios para retar a tus amigos: adivina el equipo o el jugador, once de leyenda, ¿más o menos? y el once del Barça. Ranking semanal y ligas privadas.",
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
    href: "/juegos/once-de-leyenda",
    emoji: "⭐",
    titulo: "Once de leyenda",
    texto: "Once rondas, tres leyendas por puesto. Elige y descubre la media de tu once histórico.",
    listo: true,
  },
  {
    href: "/juegos/mas-o-menos",
    emoji: "⚖️",
    titulo: "¿Más o menos?",
    texto: "¿Quién tiene más goles o asistencias esta temporada? Racha hasta que falles.",
    listo: true,
  },
  {
    href: "/juegos/modo-carrera",
    emoji: "🧑‍🦱",
    titulo: "Modo carrera",
    texto: "De segunda división con 17 años al Balón de Oro: eliges cada temporada y te fichan según tu rendimiento.",
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
          <p style={{ margin: "0 0 14px", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/juegos/ranking" className="btn btn--accent">
              🏆 Ranking de la semana
            </Link>
            <Link href="/juegos/ligas" className="btn">
              👥 Ligas con amigos
            </Link>
          </p>
          <RachaJuegos />
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
