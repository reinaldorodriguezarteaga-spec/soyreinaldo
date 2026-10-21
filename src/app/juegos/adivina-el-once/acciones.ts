"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { getFixtureById, getTeamSquad } from "@/lib/sports/api-football";
import { FORMACIONES } from "@/lib/pizarra/formaciones";
import { EQUIPO_ONCE, cerrado } from "@/lib/juegos/adivina-once";

/**
 * Guarda (o cambia) el once de un usuario. Todo se valida aquí: sesión,
 * partido del equipo, plazo, formación y que los 11 sean de la plantilla. La
 * tabla no deja escribir al usuario: va con la service role.
 */
export async function guardarOnce(datos: {
  fixture: number;
  formacion: string;
  jugadores: number[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para jugar." };

  const fx = await getFixtureById(datos.fixture).catch(() => null);
  if (!fx || ![fx.teams.home.id, fx.teams.away.id].includes(EQUIPO_ONCE)) return { ok: false, error: "Partido no válido." };
  const kickoff = new Date(fx.fixture.date);
  if (cerrado(kickoff) || fx.fixture.status.short !== "NS") return { ok: false, error: "Ya está cerrado: la alineación sale una hora antes." };
  if (!FORMACIONES.includes(datos.formacion)) return { ok: false, error: "Formación no válida." };

  const ids = [...new Set(datos.jugadores)];
  if (ids.length !== 11) return { ok: false, error: "Elige once jugadores." };
  const plantilla = new Set((await getTeamSquad(EQUIPO_ONCE).catch(() => [])).map((j) => j.id));
  if (plantilla.size === 0) return { ok: false, error: "No se pudo cargar la plantilla. Prueba en un rato." };
  if (ids.some((id) => !plantilla.has(id))) return { ok: false, error: "Hay jugadores que no son de la plantilla." };

  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo guardar." };
  const { error } = await db.from("once_predicciones").upsert(
    {
      fixture_id: datos.fixture,
      team_id: EQUIPO_ONCE,
      user_id: user.id,
      formacion: datos.formacion,
      jugadores: ids,
      kickoff_at: kickoff.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fixture_id,team_id,user_id" },
  );
  if (error) return { ok: false, error: "No se pudo guardar. Prueba otra vez." };
  revalidatePath("/juegos/adivina-el-once");
  return { ok: true };
}
