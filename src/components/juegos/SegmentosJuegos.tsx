import Link from "next/link";

const SEGMENTOS = [
  { href: "/juegos", label: "Jugar" },
  { href: "/juegos/ranking", label: "Ranking" },
  { href: "/juegos/ligas", label: "Ligas" },
];

/** Control segmentado de la sección de juegos (31-oct, estilo iOS). */
export default function SegmentosJuegos({ actual }: { actual: string }) {
  return (
    <nav className="segmentos" aria-label="Juegos">
      {SEGMENTOS.map((s) => (
        <Link key={s.href} href={s.href} aria-current={s.href === actual ? "page" : undefined}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
