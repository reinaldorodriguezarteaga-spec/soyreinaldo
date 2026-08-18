import Link from "next/link";
import type { ClubLeague } from "@/lib/quiniela-liga/leagues";

/**
 * Selector de liga para el hub de la quiniela de clubes. Solo aparece si el
 * usuario está en más de una (la mayoría está solo en la pública, o solo en
 * la privada de su comunidad, y ahí no hay nada que elegir).
 */
export default function LeagueSwitcher({
  leagues,
  active,
  basePath,
}: {
  leagues: ClubLeague[];
  active: ClubLeague | null;
  basePath: string;
}) {
  if (leagues.length < 2) return null;
  return (
    <nav
      aria-label="Elegir liga"
      className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0"
      style={{ marginBottom: 16 }}
    >
      <div className="tabs tabs--scroll">
        {leagues.map((l) => (
          <Link
            key={l.id}
            href={l.isPublic ? basePath : `${basePath}?liga=${encodeURIComponent(l.code)}`}
            className={active?.id === l.id ? "on" : ""}
          >
            {l.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
