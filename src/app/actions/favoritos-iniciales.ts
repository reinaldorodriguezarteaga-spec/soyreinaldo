"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";
import { getCompetitionStandings, type StandingRow } from "@/lib/sports/api-football";
import { equiposEnEspanol } from "@/lib/sports/nombres";

/**
 * Selector de favoritos que sale tras iniciar sesión (16-oct, pedido del
 * dueño): paso 1 ligas, paso 2 equipos de esas ligas. Se guarda en
 * `user_favorites` con el mismo formato que la estrella (actions/favorites.ts)
 * y se marca `profiles.favoritos_elegidos_at` (migración 067) para no volver
 * a enseñarlo.
 */

export type EquipoOpcion = { id: number; name: string; logo: string; slug: string };

/** Máximo de ligas de las que listar equipos: cada una es una clasificación. */
const MAX_LIGAS = 8;

/**
 * Equipos de las ligas elegidas, sacados de su clasificación (la precalcula
 * el cron en sports_cache, así que no gasta cuota). Las copas sin tabla no
 * aportan equipos: sus equipos ya salen de su liga.
 */
export async function equiposDeLigas(slugs: string[]): Promise<EquipoOpcion[]> {
  const comps = slugs
    .map((s) => COMPETITIONS_BY_SLUG[s])
    .filter((c) => c && c.standingsMode === "table")
    .slice(0, MAX_LIGAS);
  const vistos = new Set<number>();
  const out: EquipoOpcion[] = [];
  const tablas = await Promise.all(
    comps.map((c) => getCompetitionStandings(c).catch(() => null)),
  );
  comps.forEach((c, i) => {
    const filas = equiposEnEspanol((tablas[i] ?? []) as StandingRow[]);
    for (const f of filas) {
      if (!f?.team?.id || vistos.has(f.team.id)) continue;
      vistos.add(f.team.id);
      out.push({ id: f.team.id, name: f.team.name, logo: f.team.logo, slug: c.slug });
    }
  });
  return out;
}

async function marcarElegidos(
  userId: string,
  miEquipo?: { id: number; slug: string } | null,
) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      favoritos_elegidos_at: new Date().toISOString(),
      // "Mi equipo" (migración 068): el principal de los elegidos.
      ...(miEquipo ? { mi_equipo_id: miEquipo.id, mi_equipo_liga: miEquipo.slug } : {}),
    })
    .eq("id", userId);
}

export async function guardarFavoritosIniciales(
  ligas: string[],
  equipos: { id: number; name: string; slug: string }[],
  /** Id del equipo principal ("Mi equipo"); tiene que estar entre `equipos`. */
  miEquipoId?: number | null,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const filas = [
    ...ligas
      .map((s) => COMPETITIONS_BY_SLUG[s])
      .filter(Boolean)
      .map((c) => ({
        user_id: user.id,
        kind: "competition",
        ref_id: c.slug,
        label: c.name,
        link_path: `/liga/${c.slug}`,
      })),
    ...equipos
      .filter((e) => Number.isInteger(e.id) && e.id > 0 && COMPETITIONS_BY_SLUG[e.slug])
      .slice(0, 30)
      .map((e) => ({
        user_id: user.id,
        kind: "team",
        ref_id: String(e.id),
        label: String(e.name).slice(0, 80),
        link_path: `/liga/${e.slug}/equipo/${e.id}`,
      })),
  ];
  if (filas.length > 0) {
    const { error } = await supabase
      .from("user_favorites")
      .upsert(filas, { onConflict: "user_id,kind,ref_id", ignoreDuplicates: true });
    if (error) return { ok: false };
  }
  const principal = equipos.find(
    (e) => e.id === miEquipoId && COMPETITIONS_BY_SLUG[e.slug],
  );
  await marcarElegidos(user.id, principal ? { id: principal.id, slug: principal.slug } : null);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Ahora no": no vuelve a salir; los favoritos se ponen con la estrella. */
export async function saltarFavoritosIniciales(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await marcarElegidos(user.id);
  revalidatePath("/", "layout");
}
