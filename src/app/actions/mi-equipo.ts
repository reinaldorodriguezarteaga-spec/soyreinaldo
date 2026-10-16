"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

/**
 * "Mi equipo" (16-oct, pedido del dueño): el principal de entre los equipos
 * favoritos. Solo vale uno que ya esté en `user_favorites`; la liga se saca
 * de su enlace (`/liga/{slug}/equipo/{id}`), que es la competición desde la
 * que se eligió y donde se busca su puesto. `null` lo quita.
 */
export async function elegirMiEquipo(teamId: number | null): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  let liga: string | null = null;
  if (teamId != null) {
    if (!Number.isInteger(teamId) || teamId <= 0) return { ok: false };
    const { data: fav } = await supabase
      .from("user_favorites")
      .select("link_path")
      .eq("user_id", user.id)
      .eq("kind", "team")
      .eq("ref_id", String(teamId))
      .maybeSingle<{ link_path: string | null }>();
    if (!fav) return { ok: false };
    const slug = fav.link_path?.match(/^\/liga\/([^/]+)\//)?.[1] ?? null;
    liga = slug && COMPETITIONS_BY_SLUG[slug] ? slug : null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ mi_equipo_id: teamId, mi_equipo_liga: liga })
    .eq("id", user.id);
  if (error) return { ok: false };
  revalidatePath("/");
  return { ok: true };
}
