"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { numeroDelDia } from "@/lib/juegos/diario";
import { MAX_PUNTOS, NIVELES, type JuegoRanking, type Nivel } from "@/lib/juegos/niveles";

const JUEGOS: JuegoRanking[] = ["equipo", "jugador", "tikitaka", "leyenda", "masomenos"];

/**
 * Apunta los puntos del reto del día en el ranking (migración 085). Solo con
 * sesión, solo el reto de hoy (o el de ayer, por si se acabó pasada la
 * medianoche) y con el tope de puntos de cada juego. Cuenta la primera
 * partida; en ¿Más o menos?, la mejor del día.
 */
export async function guardarResultado(datos: {
  juego: JuegoRanking;
  dia: number;
  nivel: Nivel;
  puntos: number;
}): Promise<{ ok: true; nuevo: boolean } | { ok: false; error: "sesion" | "invalido" | "error" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sesion" };

  const hoy = numeroDelDia();
  const puntos = Math.round(datos.puntos);
  if (
    !JUEGOS.includes(datos.juego) ||
    !(datos.nivel in NIVELES) ||
    !(datos.dia === hoy || datos.dia === hoy - 1) ||
    !Number.isFinite(puntos) ||
    puntos < 0 ||
    puntos > MAX_PUNTOS[datos.juego]
  ) {
    return { ok: false, error: "invalido" };
  }

  const db = clienteServicio();
  if (!db) return { ok: false, error: "error" };
  const fila = { user_id: user.id, juego: datos.juego, dia: datos.dia, nivel: datos.nivel, puntos };
  const { data: previa } = await db
    .from("juego_resultados")
    .select("puntos")
    .eq("user_id", user.id)
    .eq("juego", datos.juego)
    .eq("dia", datos.dia)
    .maybeSingle<{ puntos: number }>();
  if (previa && (datos.juego !== "masomenos" || previa.puntos >= puntos)) return { ok: true, nuevo: false };
  const { error } = await db.from("juego_resultados").upsert(fila, { onConflict: "user_id,juego,dia" });
  if (error) return { ok: false, error: "error" };
  revalidatePath("/juegos/ranking");
  return { ok: true, nuevo: true };
}
