import { NextResponse, type NextRequest } from "next/server";
import { buscarJugadores } from "@/lib/juegos/buscar";
import { normalizar } from "@/lib/juegos/diario";

/**
 * Buscador de jugadores del tiki-taka-toe y el comparador (30-oct). Antes era
 * una server action y cada letra tardaba ~0,5-1,3 s: el middleware pedía la
 * sesión a Supabase en cada POST, Next pone las acciones en cola una tras
 * otra y nada se cacheaba. Como GET, fuera del middleware (ver su matcher) y
 * con caché del CDN, la misma búsqueda de otro jugador sale al momento.
 */
export async function GET(request: NextRequest) {
  const q = normalizar((request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40));
  if (q.length < 3) return NextResponse.json([]);
  const resultado = await buscarJugadores(q, 12);
  return NextResponse.json(resultado, {
    headers: {
      // Vacío puede ser un fallo pasajero del API: poco rato en caché.
      "Cache-Control": resultado.length
        ? "public, s-maxage=86400, stale-while-revalidate=604800"
        : "public, s-maxage=300",
    },
  });
}
