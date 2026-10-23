"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { getFixtureGoals, reconcileGoals } from "@/lib/sports/api-football";
import { filasDirecto } from "@/lib/sports/directo";
import { ELECCIONES, MINUTO_CIERRE, golesDe, minutoDePronostico, resolver, type Eleccion } from "@/lib/partido/siguiente-gol";

/**
 * Pronóstico de «¿Quién marca el siguiente gol?» (migración 091). El minuto
 * lo pone el servidor con el directo del cron (`partidos_directo`): sin
 * directo no se apuesta, y así no se llama nunca a la API. Uno abierto a la
 * vez: hasta que se resuelve el anterior, no hay otro.
 */
export async function pronosticarSiguienteGol(
  fixtureId: number,
  eleccion: Eleccion,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ELECCIONES.includes(eleccion)) return { ok: false, error: "Pronóstico no válido." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entra con tu cuenta para jugar." };

  const fx = (await filasDirecto()).get(fixtureId);
  if (!fx) return { ok: false, error: "Solo se puede jugar con el partido en juego." };
  const minuto = minutoDePronostico(fx.fixture.status.short, fx.fixture.status.elapsed);
  if (minuto == null) return { ok: false, error: "Solo se puede jugar con el partido en juego." };
  if (fx.fixture.status.short !== "HT" && minuto >= MINUTO_CIERRE) {
    return { ok: false, error: `Desde el minuto ${MINUTO_CIERRE} ya no se puede pronosticar.` };
  }

  const goles = golesDe(
    reconcileGoals(await getFixtureGoals(fixtureId, 20), {
      homeId: fx.teams.home.id,
      awayId: fx.teams.away.id,
      scoreHome: fx.goals.home,
      scoreAway: fx.goals.away,
    }),
    fx.teams.home.id,
  );
  const { data: previos } = await supabase
    .from("siguiente_gol")
    .select("minuto")
    .eq("fixture_id", fixtureId)
    .eq("user_id", user.id)
    .returns<{ minuto: number }[]>();
  if ((previos ?? []).some((p) => resolver(p.minuto, goles, false) == null)) {
    return { ok: false, error: "Ya tienes un pronóstico abierto: espera al siguiente gol." };
  }

  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo guardar." };
  const { error } = await db.from("siguiente_gol").insert({ fixture_id: fixtureId, user_id: user.id, minuto, eleccion });
  if (error) return { ok: false, error: error.code === "23505" ? "Ya pronosticaste en este minuto." : "No se pudo guardar." };
  revalidatePath("/liga/[slug]/partido/[id]", "page");
  return { ok: true };
}
