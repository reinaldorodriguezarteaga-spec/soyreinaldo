import { NextResponse } from "next/server";
import {
  searchPlayersGlobal,
  searchTeamsGlobal,
  type PlayerGlobalSearchResult,
  type TeamSearchResult,
} from "@/lib/sports/api-football";
import { seguimosSuPais, slugParaEquipo } from "@/lib/sports/search-links";
import { clientePublico } from "@/lib/supabase/publico";

export const runtime = "nodejs";

export type BusquedaUniversal = {
  equipos: (TeamSearchResult & { slug: string })[];
  jugadores: PlayerGlobalSearchResult[];
  /** Con el buscador vacío: los más buscados (4-nov). */
  destacados?: PlayerGlobalSearchResult[];
};

type Buscado = { id: number; nombre: string | null; foto: string | null; visitas: number };

/** Los más buscados, para el buscador vacío. */
async function masBuscados(): Promise<PlayerGlobalSearchResult[]> {
  const { data } = await clientePublico()
    .from("jugadores_buscados")
    .select("id, nombre, foto, visitas")
    .not("nombre", "is", null)
    .order("visitas", { ascending: false })
    .limit(8)
    .returns<Buscado[]>();
  return (data ?? []).map((b) => ({ id: b.id, name: b.nombre ?? "", photo: b.foto, nationality: null }));
}

/**
 * Jugadores (4-nov): «lamine» no sacaba a Lamine Yamal hasta escribir el
 * nombre entero, porque el API devuelve cientos de «Lamine» sin orden. Ahora
 * primero se buscan en las plantillas de nuestras competiciones
 * (`comparador_buscar`, sin tildes y por cualquier parte del nombre), luego
 * se añade lo del API, y todo se ordena por cuántas veces se ha buscado cada
 * uno (`jugadores_buscados`) y, a igualdad, lo nuestro delante.
 */
async function jugadoresOrdenados(q: string): Promise<PlayerGlobalSearchResult[]> {
  const db = clientePublico();
  const [{ data: locales }, api] = await Promise.all([
    db.rpc("comparador_buscar", { p_q: q, p_limite: 12 }),
    searchPlayersGlobal(q),
  ]);
  const vistos = new Map<number, PlayerGlobalSearchResult & { local: boolean }>();
  for (const l of (locales ?? []) as { id: number; nombre: string; foto: string | null }[]) {
    vistos.set(l.id, { id: l.id, name: l.nombre, photo: l.foto, nationality: null, local: true });
  }
  for (const a of api) {
    const ya = vistos.get(a.id);
    vistos.set(a.id, ya ? { ...ya, nationality: a.nationality, name: a.name || ya.name } : { ...a, local: false });
  }
  const ids = [...vistos.keys()];
  const { data: buscados } = ids.length
    ? await db.from("jugadores_buscados").select("id, nombre, foto, visitas").in("id", ids).returns<Buscado[]>()
    : { data: [] as Buscado[] };
  const visitas = new Map((buscados ?? []).map((b) => [b.id, b]));
  const term = q.trim().toLowerCase();
  const encaje = (nombre: string) => {
    const n = nombre.toLowerCase();
    if (n.startsWith(term)) return 0;
    if (n.split(/\s+/).some((w) => w.startsWith(term))) return 1;
    return 2;
  };
  return [...vistos.values()]
    .map((j) => {
      const b = visitas.get(j.id);
      // El nombre completo que guardamos («Jude Bellingham») gana al
      // abreviado de la plantilla («J. Bellingham»).
      return { ...j, name: b?.nombre ?? j.name, visitas: b?.visitas ?? 0 };
    })
    .sort(
      (a, b) =>
        b.visitas - a.visitas ||
        Number(b.local) - Number(a.local) ||
        encaje(a.name) - encaje(b.name) ||
        a.name.length - b.name.length,
    )
    .slice(0, 10)
    .map(({ id, name, photo, nationality }) => ({ id, name, photo, nationality }));
}

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
    const destacados = await masBuscados().catch(() => []);
    return NextResponse.json({ equipos: [], jugadores: [], destacados } satisfies BusquedaUniversal);
  }
  try {
    const [equipos, jugadores] = await Promise.all([
      searchTeamsGlobal(q),
      jugadoresOrdenados(q),
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
