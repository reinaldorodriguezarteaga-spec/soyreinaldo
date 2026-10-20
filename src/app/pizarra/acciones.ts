"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFixtureById } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { equiposEnEspanol } from "@/lib/sports/nombres";
import { equiposPizarra } from "@/lib/pizarra/equipos";
import { decodificar } from "@/lib/pizarra/estado";

/**
 * Pizarras de la comunidad (20-oct): publicar, «me gusta» y moderar. La RLS
 * (migración 079) manda: solo con cuenta, cada uno lo suyo y el admin oculta.
 * Nombres y escudos se toman del servidor (lista de equipos o el partido),
 * nunca del navegador.
 */
type Resultado = { ok: true; id?: string } | { ok: false; error: string };

export async function publicarPizarra(datos: {
  titulo: string;
  local: number;
  visitante: number;
  partido?: number;
  p: string;
}): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para publicar." };

  const titulo = (datos.titulo ?? "").trim().replace(/\s+/g, " ");
  if (titulo.length < 3 || titulo.length > 80) return { ok: false, error: "El título debe tener entre 3 y 80 caracteres." };
  const estado = decodificar(datos.p, null);
  if (!estado || datos.p.length > 12000) return { ok: false, error: "No se pudo leer la pizarra." };
  if (!estado.once.local.some((x) => x != null) && !estado.once.visitante.some((x) => x != null)) {
    return { ok: false, error: "Coloca algún jugador antes de publicar." };
  }

  // Equipos: del partido (si viene de uno de los nuestros) o de la lista.
  let local: { id: number; name: string; logo: string } | null = null;
  let visitante: { id: number; name: string; logo: string } | null = null;
  let partido: number | null = null;
  if (datos.partido) {
    const fx = await getFixtureById(datos.partido).catch(() => null);
    if (fx && COMPETITIONS.some((c) => c.leagueId === fx.league.id)) {
      const es = equiposEnEspanol(fx);
      if (es.teams.home.id === datos.local && es.teams.away.id === datos.visitante) {
        local = es.teams.home;
        visitante = es.teams.away;
        partido = datos.partido;
      }
    }
  }
  if (!local || !visitante) {
    const porId = new Map((await equiposPizarra()).flatMap((g) => g.equipos.map((e) => [e.id, e] as const)));
    local = porId.get(datos.local) ?? null;
    visitante = porId.get(datos.visitante) ?? null;
  }
  if (!local || !visitante) return { ok: false, error: "Equipos no válidos." };

  const { data, error } = await supabase
    .from("pizarras")
    .insert({
      user_id: user.id,
      titulo,
      local_id: local.id,
      local_nombre: local.name,
      local_logo: local.logo,
      visitante_id: visitante.id,
      visitante_nombre: visitante.name,
      visitante_logo: visitante.logo,
      partido_id: partido,
      estado: datos.p,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    return { ok: false, error: error?.message.includes("máximo") ? error.message : "No se pudo publicar. Prueba otra vez." };
  }
  revalidatePath("/pizarra/comunidad");
  return { ok: true, id: data.id };
}

export async function alternarLike(id: string): Promise<{ ok: boolean; leGusta?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: ya } = await supabase
    .from("pizarra_likes")
    .select("pizarra_id")
    .eq("pizarra_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const { error } = ya
    ? await supabase.from("pizarra_likes").delete().eq("pizarra_id", id).eq("user_id", user.id)
    : await supabase.from("pizarra_likes").insert({ pizarra_id: id, user_id: user.id });
  if (error) return { ok: false };
  revalidatePath("/pizarra/comunidad");
  return { ok: true, leGusta: !ya };
}

/** El autor la borra; el admin la oculta (sigue en la base por si acaso). */
export async function retirarPizarra(id: string, comoAdmin: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = comoAdmin
    ? await supabase.from("pizarras").update({ oculta: true }).eq("id", id)
    : await supabase.from("pizarras").delete().eq("id", id);
  if (error) return { ok: false };
  revalidatePath("/pizarra/comunidad");
  return { ok: true };
}
