import { NextResponse } from "next/server";
import {
  searchPlayersGlobal,
  searchTeamsGlobal,
  type PlayerGlobalSearchResult,
  type TeamSearchResult,
} from "@/lib/sports/api-football";
import { seguimosSuPais, slugParaEquipo } from "@/lib/sports/search-links";

export const runtime = "nodejs";

export type BusquedaUniversal = {
  equipos: (TeamSearchResult & { slug: string })[];
  jugadores: PlayerGlobalSearchResult[];
};

/**
 * Búsqueda universal: equipos y jugadores de CUALQUIER liga.
 *   GET /api/sports/search?q=chelsea
 *
 * Dos llamadas a API-Football por consulta (una de equipos, otra de
 * jugadores), ambas cacheadas un día — buscar lo mismo dos veces no gasta
 * cuota. Los resultados llevan ya el slug de la competición para el enlace.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 3) {
    return NextResponse.json({ equipos: [], jugadores: [] } satisfies BusquedaUniversal);
  }
  try {
    const [equipos, jugadores] = await Promise.all([
      searchTeamsGlobal(q),
      searchPlayersGlobal(q),
    ]);
    return NextResponse.json({
      // Primero los de las ligas que seguimos: son los que el sitio sabe
      // contar de verdad (y los que el buscador está pensando para servir).
      equipos: equipos
        .map((t) => ({ ...t, slug: slugParaEquipo(t.country) }))
        .sort(
          (a, b) =>
            Number(seguimosSuPais(b.country)) - Number(seguimosSuPais(a.country)),
        ),
      jugadores,
    } satisfies BusquedaUniversal);
  } catch {
    return NextResponse.json({ equipos: [], jugadores: [] } satisfies BusquedaUniversal);
  }
}
