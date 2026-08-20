"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aSlug } from "@/lib/analisis/markdown";

export type EstadoAnalisis = {
  status: "idle" | "success" | "error";
  message?: string;
};

/** El admin del sitio es el único que escribe. La RLS de `articles` lo impone
 * igualmente; esto solo da un error legible en vez de uno de base de datos. */
async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!perfil?.is_admin) throw new Error("No autorizado");
  return { supabase, user };
}

export async function guardarAnalisis(
  _prev: EstadoAnalisis,
  formData: FormData,
): Promise<EstadoAnalisis> {
  const id = (formData.get("id") as string | null) || null;
  const titulo = (formData.get("title") as string | null)?.trim() ?? "";
  const cuerpo = (formData.get("body") as string | null) ?? "";
  const entradilla = (formData.get("excerpt") as string | null)?.trim() || null;
  const portada = (formData.get("cover_url") as string | null)?.trim() || null;
  const slugManual = (formData.get("slug") as string | null)?.trim() || "";
  const partido = (formData.get("fixture_id") as string | null)?.trim() || "";
  const competicion = (formData.get("competition_slug") as string | null)?.trim() || null;
  const publicar = formData.get("publicar") === "on";

  if (titulo.length < 3) {
    return { status: "error", message: "El título es demasiado corto." };
  }
  if (cuerpo.trim().length < 20) {
    return { status: "error", message: "El cuerpo está prácticamente vacío." };
  }

  const fixtureId = partido ? Number.parseInt(partido, 10) : null;
  if (partido && !Number.isInteger(fixtureId)) {
    return { status: "error", message: "El id del partido tiene que ser un número." };
  }
  if (fixtureId && !competicion) {
    return {
      status: "error",
      message: "Si enganchas un partido, elige también su competición.",
    };
  }

  const { supabase, user } = await exigirAdmin();
  const slug = aSlug(slugManual || titulo);
  if (!slug) return { status: "error", message: "No sale un enlace válido de ese título." };

  const fila = {
    slug,
    title: titulo,
    excerpt: entradilla,
    body: cuerpo,
    cover_url: portada,
    fixture_id: fixtureId,
    competition_slug: fixtureId ? competicion : null,
    author_id: user.id,
  };

  // Publicar pone la fecha; despublicar la quita y vuelve a borrador.
  const { data: previo } = id
    ? await supabase.from("articles").select("published_at").eq("id", id).maybeSingle<{ published_at: string | null }>()
    : { data: null };
  const published_at = publicar
    ? (previo?.published_at ?? new Date().toISOString())
    : null;

  const { error } = id
    ? await supabase.from("articles").update({ ...fila, published_at }).eq("id", id)
    : await supabase.from("articles").insert({ ...fila, published_at });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: `Ya hay un análisis con el enlace "${slug}". Cambia el título o pon un enlace propio.`,
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath("/analisis");
  revalidatePath(`/analisis/${slug}`);
  revalidatePath("/admin/analisis");
  if (fixtureId && competicion) {
    revalidatePath(`/liga/${competicion}/partido/${fixtureId}`);
  }
  redirect("/admin/analisis?guardado=1");
}

export async function borrarAnalisis(formData: FormData) {
  const id = formData.get("id") as string | null;
  if (!id) return;
  const { supabase } = await exigirAdmin();
  await supabase.from("articles").delete().eq("id", id);
  revalidatePath("/analisis");
  revalidatePath("/admin/analisis");
}
