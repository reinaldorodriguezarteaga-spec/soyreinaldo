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
};

const CAMPOS =
  "id, slug, title, excerpt, body, cover_url, fixture_id, competition_slug, team_id, published_at, updated_at";

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
