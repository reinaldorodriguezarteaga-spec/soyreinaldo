import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  Flag,
  Grid3x3,
  ListOrdered,
  Spline,
  HelpCircle,
  Shield,
  ImageOff,
  LayoutGrid,
  CalendarRange,
  Scale,
  Star,
  TrendingUp,
  UserSearch,
} from "lucide-react";
import Icono from "@/components/Icono";
import RachaJuegos from "@/components/juegos/RachaJuegos";
import SegmentosJuegos from "@/components/juegos/SegmentosJuegos";
import ArribaAlEntrar from "@/components/juegos/ArribaAlEntrar";
import HechoHoy from "@/components/juegos/HechoHoy";
import RetoDelDia from "@/components/juegos/RetoDelDia";

export const metadata: Metadata = {
  title: "Juegos de fútbol | Soy Reinaldo",
  description:
    "Juegos de fútbol diarios para retar a tus amigos: adivina el equipo o el jugador, top 10, ahorcado, tiki-taka-toe, once de leyenda, ¿más o menos? y el once del Barça. Ranking semanal y ligas privadas.",
  alternates: { canonical: "/juegos" },
};

/** Pestaña de juegos (21-oct, pedido del dueño): aquí van todos. */
const JUEGOS = [
  {
    href: "/juegos/adivina-el-equipo",
    clave: "jg-equipo-v1",
    corto: "Un once histórico con banderas",
    icono: Flag,
    tono: "azul",
    titulo: "Adivina el equipo",
  },
  {
    href: "/juegos/top-10",
    clave: "jg-top10-v1",
    corto: "Los 10 que más jugaron o marcaron",
    icono: ListOrdered,
    tono: "verde",
    titulo: "Top 10",
  },
  {
    href: "/juegos/futbolista-misterioso",
    clave: "jg-misterioso-v1",
    corto: "Pistas al comparar con otros jugadores",
    icono: HelpCircle,
    tono: "morado",
    titulo: "Futbolista misterioso",
  },
  {
    href: "/juegos/escudo-borroso",
    clave: "jg-escudo-v1",
    corto: "Se aclara con cada fallo",
    icono: Shield,
    tono: "azul",
    titulo: "Escudo borroso",
  },
  {
    href: "/juegos/foto-oculta",
    clave: "jg-foto-v1",
    corto: "Se destapa por trozos",
    icono: ImageOff,
    tono: "naranja",
    titulo: "Foto oculta",
  },
  {
    href: "/juegos/agrupa-los-cuatro",
    clave: "jg-agrupa-v1",
    corto: "16 nombres, 4 grupos",
    icono: LayoutGrid,
    tono: "verde",
    titulo: "Agrupa los cuatro",
  },
  {
    href: "/juegos/cronologia",
    clave: "jg-cronologia-v1",
    corto: "Ordena los momentos por fecha",
    icono: CalendarRange,
    tono: "oro",
    titulo: "Cronología",
  },
  {
    href: "/juegos/ahorcado",
    clave: "jg-ahorcado-v1",
    corto: "Letra a letra, antes de cinco fallos",
    icono: Spline,
    tono: "rojo",
    titulo: "Ahorcado",
  },
  {
    href: "/juegos/adivina-el-jugador",
    clave: "jg-jugador-v1",
    corto: "Sus clubes, en orden",
    icono: UserSearch,
    tono: "morado",
    titulo: "Adivina el jugador",
  },
  {
    href: "/juegos/tiki-taka-toe",
    clave: "jg-tikitaka-v1",
    corto: "El tres en raya del fútbol",
    icono: Grid3x3,
    tono: "verde",
    titulo: "Tiki-taka-toe",
  },
  {
    href: "/juegos/once-de-leyenda",
    clave: "jg-leyendas-v1",
    corto: "Elige tu once histórico",
    icono: Star,
    tono: "oro",
    titulo: "Once de leyenda",
  },
  {
    href: "/juegos/mas-o-menos",
    clave: "jg-masomenos-v1",
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
  return (
    <main className="page">
      <ArribaAlEntrar />
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap ios">
          <header className="ios__cab">
            <h1 className="ios__titulo">Juegos</h1>
            <p className="ios__sub">Retos para jugar cada día y picar a tus amigos.</p>
          </header>
          <SegmentosJuegos actual="/juegos" />
          <RetoDelDia />
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
                    {"clave" in j && <HechoHoy clave={j.clave} />}
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
