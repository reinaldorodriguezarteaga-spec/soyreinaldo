"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aSlug } from "@/lib/analisis/markdown";
import {
  getCompetitionStandings,
  getTeamFixtures,
  type Fixture,
  type StandingRow,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG } from "@/lib/sports/competitions";

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
  // Guardar PUBLICA por defecto (pedido del dueño 23-ago: lo normal es
  // publicar; dejarlo en borrador es la excepción). La casilla marca el caso
  // raro, no el habitual.
  const publicar = formData.get("borrador") !== "on";

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

/* ---------------------------------------------------------------------- *
 * Selector de partido del editor (23-ago). Antes había que ir a la web,
 * abrir el partido y copiar el número del final de la URL. Ahora se elige
 * competición → equipo → partido, que es como lo piensa quien escribe.
 * ---------------------------------------------------------------------- */

export type EquipoOpcion = { id: number; nombre: string };
export type PartidoOpcion = { id: number; etiqueta: string; jugado: boolean };

/** Equipos de una competición, para el desplegable. Sale de la clasificación,
 * que ya está cacheada — no gasta cuota extra. */
export async function equiposDeCompeticion(slug: string): Promise<EquipoOpcion[]> {
  await exigirAdmin();
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return [];
  try {
    const filas = (await getCompetitionStandings(competition)) as StandingRow[] | null;
    const porId = new Map<number, EquipoOpcion>();
    for (const f of filas ?? []) {
      if (!porId.has(f.team.id)) porId.set(f.team.id, { id: f.team.id, nombre: f.team.name });
    }
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch {
    return [];
  }
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "short",
});

/**
 * Partidos de un equipo para enganchar el análisis: el último jugado y los
 * dos siguientes. Nada más — un análisis se escribe sobre lo que acaba de
 * pasar o sobre lo que viene ya, no sobre la jornada 30.
 */
export async function partidosDeEquipo(teamId: number): Promise<PartidoOpcion[]> {
  await exigirAdmin();
  if (!Number.isFinite(teamId) || teamId <= 0) return [];
  try {
    const { recent, upcoming } = await getTeamFixtures(teamId, { last: 1, next: 2 });
    const etiqueta = (f: Fixture, jugado: boolean) => {
      const cuando = FECHA_CORTA.format(new Date(f.fixture.date));
      const marcador = jugado ? ` (${f.goals.home ?? 0}-${f.goals.away ?? 0})` : "";
      const cara = jugado ? "Jugado" : "Próximo";
      return `${cara} · ${cuando} · ${f.teams.home.name} - ${f.teams.away.name}${marcador}`;
    };
    return [
      ...recent.slice(-1).map((f) => ({ id: f.fixture.id, etiqueta: etiqueta(f, true), jugado: true })),
      ...upcoming.slice(0, 2).map((f) => ({ id: f.fixture.id, etiqueta: etiqueta(f, false), jugado: false })),
    ];
  } catch {
    return [];
  }
}
