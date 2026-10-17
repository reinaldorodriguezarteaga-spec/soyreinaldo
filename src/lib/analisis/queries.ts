import { esDelEquipo } from "./equipo";
import { createClient } from "@/lib/supabase/server";

export type Articulo = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  fixture_id: number | null;
  competition_slug: string | null;
  team_id: number | null;
  published_at: string | null;
  updated_at: string;
  /** Lecturas contadas desde el navegador (los bots se descartan en el RPC). */
  view_count: number;
  /** Veces que alguien pulsó un botón de compartir. */
  share_count: number;
};

const CAMPOS =
  "id, slug, title, excerpt, body, cover_url, fixture_id, competition_slug, team_id, published_at, updated_at, view_count, share_count";

/** Publicados, del más reciente al más antiguo. La RLS ya esconde borradores. */
export async function listarPublicados(limite = 30): Promise<Articulo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(CAMPOS)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limite)
    .returns<Articulo[]>();
  return data ?? [];
}

export async function porSlug(slug: string): Promise<Articulo | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(CAMPOS)
    .eq("slug", slug)
    .maybeSingle<Articulo>();
  return data ?? null;
}

/** Los análisis enganchados a un partido, para pintarlos en su ficha. */
export async function porPartido(fixtureId: number): Promise<Articulo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select(CAMPOS)
    .eq("fixture_id", fixtureId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .returns<Articulo[]>();
  return data ?? [];
}

/** Últimos análisis del equipo, incluso si el editor solo indicó el partido o el título. */
export async function porEquipo(
  teamId: number,
  nombre: string,
  fixtureIds: number[],
  limite = 3,
): Promise<Articulo[]> {
  if (limite <= 0) return [];
  const supabase = await createClient();
  const equipo = { id: teamId, nombre, partidos: new Set(fixtureIds) };
  const ids: string[] = [];
  const lote = 100;
  // Solo vínculos y títulos hasta encontrar suficientes: no descargamos todos
  // los cuerpos ni dejamos fuera asociaciones antiguas por un límite global.
  for (let desde = 0; ids.length < limite; desde += lote) {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, team_id, fixture_id")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .order("id", { ascending: true })
      .range(desde, desde + lote - 1);
    if (error) throw error;
    for (const a of data ?? []) {
      if (esDelEquipo(a, equipo)) ids.push(a.id);
      if (ids.length === limite) break;
    }
    if (!data || data.length < lote) break;
  }
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("articles")
    .select(CAMPOS)
    .in("id", ids)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .order("id", { ascending: true })
    .returns<Articulo[]>();
  if (error) throw error;
  return data ?? [];
}
