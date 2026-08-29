"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Tope del tablón; el mismo que el CHECK de la BD (migración 050). */
const COMENTARIO_MAX = 1000;

/**
 * Publica un comentario en el tablón de un análisis. La autoría y el "solo
 * artículos publicados" los garantiza la RLS de `article_comments`; aquí solo
 * se valida lo que merece un mensaje de error legible.
 */
export async function publicarComentario(
  slug: string,
  cuerpo: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Inicia sesión para dejar tu opinión." };

  const body = cuerpo.trim();
  if (!body) return { error: "Escribe algo antes de publicar." };
  if (body.length > COMENTARIO_MAX) {
    return { error: `Máximo ${COMENTARIO_MAX} caracteres.` };
  }

  // La RLS de `articles` esconde los borradores: para quien comenta, un
  // borrador simplemente no existe.
  const { data: articulo } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();
  if (!articulo) return { error: "Este análisis ya no está disponible." };

  const { error } = await supabase
    .from("article_comments")
    .insert({ article_id: articulo.id, user_id: user.id, body });
  if (error) return { error: "No se pudo publicar. Inténtalo otra vez." };

  revalidatePath(`/analisis/${slug}`);
  return {};
}

/**
 * Borra un comentario. La RLS solo deja borrar los propios (o todos al
 * admin), así que un id ajeno simplemente no borra nada.
 */
export async function borrarComentario(
  id: string,
  slug: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("article_comments")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { error: "No se pudo borrar el comentario." };
  }
  revalidatePath(`/analisis/${slug}`);
  return {};
}

/**
 * Contadores de un análisis. Son RPC SECURITY DEFINER porque la RLS de
 * `articles` solo deja escribir al admin; el filtro anti-rastreadores vive
 * dentro del SQL (ver migración 049), que es donde se ve el User-Agent real.
 *
 * Ninguna de las dos devuelve nada ni rompe la página si falla: un contador
 * es un extra, nunca puede tumbar la lectura de un artículo.
 */
export async function marcarVista(slug: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("articles_marcar_vista", { p_slug: slug });
  } catch {
    // Contar es opcional.
  }
}

export async function marcarCompartido(slug: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("articles_marcar_compartido", { p_slug: slug });
  } catch {
    // Contar es opcional.
  }
}
