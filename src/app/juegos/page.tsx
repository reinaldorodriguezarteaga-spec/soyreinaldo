import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  Flame,
  Flag,
  Grid3x3,
  Scale,
  Star,
  TrendingUp,
  UserSearch,
} from "lucide-react";
import Icono from "@/components/Icono";
import RachaJuegos from "@/components/juegos/RachaJuegos";
import SegmentosJuegos from "@/components/juegos/SegmentosJuegos";

export const metadata: Metadata = {
  title: "Juegos de fútbol | Soy Reinaldo",
  description:
    "Juegos de fútbol diarios para retar a tus amigos: adivina el equipo o el jugador, tiki-taka-toe, once de leyenda, ¿más o menos? y el once del Barça. Ranking semanal y ligas privadas.",
  alternates: { canonical: "/juegos" },
};

/** Pestaña de juegos (21-oct, pedido del dueño): aquí van todos. */
const JUEGOS = [
  {
    href: "/juegos/adivina-el-equipo",
    corto: "Un once histórico con banderas",
    icono: Flag,
    tono: "azul",
    titulo: "Adivina el equipo",
  },
  {
    href: "/juegos/adivina-el-jugador",
    corto: "Sus clubes, en orden",
    icono: UserSearch,
    tono: "morado",
    titulo: "Adivina el jugador",
  },
  {
    href: "/juegos/tiki-taka-toe",
    corto: "El tres en raya del fútbol",
    icono: Grid3x3,
    tono: "verde",
    titulo: "Tiki-taka-toe",
  },
  {
    href: "/juegos/once-de-leyenda",
    corto: "Elige tu once histórico",
    icono: Star,
    tono: "oro",
    titulo: "Once de leyenda",
  },
  {
    href: "/juegos/mas-o-menos",
    corto: "Racha hasta que falles",
    icono: Scale,
    tono: "naranja",
    titulo: "¿Más o menos?",
  },
  {
    href: "/juegos/modo-carrera",
    corto: "De la cantera al Balón de Oro",
    icono: TrendingUp,
    tono: "rojo",
    titulo: "Modo carrera",
  },
  {
    href: "/juegos/adivina-el-once",
    corto: "El once del Barça, antes del partido",
    icono: ClipboardList,
    tono: "azul",
    titulo: "Adivina el once",
  },
] as const;

export default function JuegosPage() {
  const reto = JUEGOS[0];
  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap ios">
          <header className="ios__cab">
            <h1 className="ios__titulo">Juegos</h1>
            <p className="ios__sub">Retos para jugar cada día y picar a tus amigos.</p>
          </header>
          <SegmentosJuegos actual="/juegos" />
          <Link href={reto.href} className="destacada">
            <Icono icono={Flame} />
            <span className="destacada__txt">
              <small>Reto del día</small>
              <b>{reto.titulo}</b>
              <span>{reto.corto}</span>
            </span>
            <ChevronRight aria-hidden />
          </Link>
          <RachaJuegos />
          <section className="lista-grupo">
            <h2 className="lista-grupo__h">Todos los juegos</h2>
            <ul className="lista">
              {JUEGOS.map((j) => (
                <li key={j.href}>
                  <Link href={j.href} className="lista__fila">
                    <Icono icono={j.icono} tono={j.tono} />
                    <span className="lista__txt">
                      <b>{j.titulo}</b>
                      <span>{j.corto}</span>
                    </span>
                    <ChevronRight className="lista__ir" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
