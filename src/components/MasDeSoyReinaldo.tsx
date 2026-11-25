import { CalendarDays, ChevronRight, Newspaper, Trophy } from "lucide-react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { clientePublico } from "@/lib/supabase/publico";

/** El último análisis publicado, con caché: las fichas reciben mucho tráfico
 * (casi todo, robots) y no deben consultar la base de datos en cada visita.
 * El try/catch va DENTRO (ver AGENTS.md). */
const ultimoAnalisis = unstable_cache(
  async (): Promise<{ slug: string; title: string } | null> => {
    try {
      const { data } = await clientePublico()
        .from("articles")
        .select("slug, title")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ slug: string; title: string }>();
      return data ?? null;
    } catch {
      return null;
    }
  },
  ["fichas-ultimo-analisis"],
  { revalidate: 600 },
);

/**
 * «Más en Soy Reinaldo», al pie de las fichas de jugador, equipo y partido
 * (25-nov-2026). Las fichas son lo que más visita la gente que llega de
 * Google, y casi nadie pasaba de ahí a la portada: este bloque lleva al
 * calendario de hoy, al juego y al último análisis. Sin llamadas a
 * API-Football.
 */
export default async function MasDeSoyReinaldo() {
  const analisis = await ultimoAnalisis();
  const filas = [
    {
      href: "/",
      Icono: CalendarDays,
      titulo: "¿Qué se juega hoy?",
      sub: "Calendario y resultados en directo de 10 competiciones",
    },
    {
      href: "/adivina",
      Icono: Trophy,
      titulo: "Adivina el marcador",
      sub: "Gratis: suma puntos y compite con otros aficionados",
    },
    ...(analisis
      ? [
          {
            href: `/analisis/${analisis.slug}`,
            Icono: Newspaper,
            titulo: analisis.title,
            sub: "El último análisis de Reinaldo",
          },
        ]
      : []),
  ];

  return (
    <nav className="panel masr" aria-label="Más en Soy Reinaldo">
      <p className="masr__cab">Más en Soy Reinaldo</p>
      {filas.map(({ href, Icono, titulo, sub }) => (
        <Link key={href} href={href} className="masr__fila">
          <span className="masr__ico" aria-hidden>
            <Icono size={18} />
          </span>
          <span className="masr__txt">
            <span className="masr__tit">{titulo}</span>
            <span className="masr__sub">{sub}</span>
          </span>
          <ChevronRight size={16} className="masr__flecha" aria-hidden />
        </Link>
      ))}
    </nav>
  );
}
