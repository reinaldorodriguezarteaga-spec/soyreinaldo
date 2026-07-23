"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FavoriteState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** El botón cliente usa esto para mandar a /login en vez de fallar en silencio. */
  needsLogin?: boolean;
  /** Estado resultante tras el toggle, para que el botón sepa si pintarse lleno o vacío. */
  favorited?: boolean;
};

type CompetitionInput = { slug: string; name: string };
type TeamInput = { id: number; name: string; homeCompetitionSlug: string };

/**
 * Alta/baja de favorito (toggle simple): si ya existe la fila la borra, si no
 * existe la inserta. No hace falta upsert — el PK compuesto (user_id, kind,
 * ref_id) ya evita duplicados y un DELETE sobre una fila inexistente es un
 * no-op en Postgres.
 */
async function toggleFavorite(
  kind: "competition" | "team",
  refId: string,
  label: string,
  linkPath: string,
): Promise<FavoriteState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      needsLogin: true,
      message: "Inicia sesión para guardar favoritos.",
    };
  }

  const { data: existing } = await supabase
    .from("user_favorites")
    .select("ref_id")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .eq("ref_id", refId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("ref_id", refId);
    if (error) {
      return { status: "error", message: error.message, favorited: true };
    }
    revalidatePath(linkPath);
    // El desplegable "Favoritos" del header vive en el layout raíz, presente
    // en toda la app — hay que invalidarlo ahí para que se actualice sin F5.
    revalidatePath("/", "layout");
    return { status: "success", favorited: false };
  }

  const { error } = await supabase.from("user_favorites").insert({
    user_id: user.id,
    kind,
    ref_id: refId,
    label,
    link_path: linkPath,
  });
  if (error) {
    return { status: "error", message: error.message, favorited: false };
  }
  revalidatePath(linkPath);
  revalidatePath("/", "layout");
  return { status: "success", favorited: true };
}

export async function toggleCompetitionFavorite(
  competition: CompetitionInput,
): Promise<FavoriteState> {
  return toggleFavorite(
    "competition",
    competition.slug,
    competition.name,
    `/liga/${competition.slug}`,
  );
}

export async function toggleTeamFavorite(team: TeamInput): Promise<FavoriteState> {
  return toggleFavorite(
    "team",
    String(team.id),
    team.name,
    `/liga/${team.homeCompetitionSlug}/equipo/${team.id}`,
  );
}

/** Para pintar la estrella llena/vacía en el primer render, sin fetch en el cliente. */
export async function isFavorited(
  kind: "competition" | "team",
  refId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("user_favorites")
    .select("ref_id")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .eq("ref_id", refId)
    .maybeSingle();

  return !!data;
}
