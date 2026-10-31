import Link from "next/link";
import { MENU_COMPETICIONES } from "@/lib/sports/competitions";

/**
 * Contenido del desplegable «Competiciones» (31-oct): por países, cada
 * competición con su logo y su nombre. Lo usan el menú del escritorio y el ☰
 * del móvil.
 */
export default function CompeticionesMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="compmenu">
      {MENU_COMPETICIONES.map((g) => (
        <section key={g.titulo} className="compmenu__grupo">
          <p className="compmenu__h">{g.titulo}</p>
          {g.competitions.map((c) => (
            <Link key={c.slug} href={`/liga/${c.slug}`} className="compmenu__fila" onClick={onNavigate}>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo de la CDN de la API */}
              <img src={`https://media.api-sports.io/football/leagues/${c.leagueId}.png`} alt="" width={28} height={28} loading="lazy" />
              <b>{c.name}</b>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}
