"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Duelos de la quiniela: las reglas (próxima jornada sin empezar, miembros
 * de la liga, máximo de retos) las validan las RPC de la migración 070.
 */

export type ResultadoDuelo = { ok: true } | { ok: false; mensaje: string };

const MENSAJES: Record<string, string> = {
  sin_sesion: "Inicia sesión para retar.",
  a_ti_mismo: "No puedes retarte a ti mismo.",
  sin_jornada: "No hay ninguna jornada por empezar.",
  no_miembro: "Los dos tenéis que estar en esta liga.",
  max_retos: "Ya has lanzado 3 retos esta jornada.",
  ya_retado: "Ya tenéis un duelo en esta jornada.",
  no_valido: "Ese reto ya no está pendiente.",
  cerrado: "La jornada ya ha empezado: el reto se cerró.",
};

function traducir(error: { message: string } | null): ResultadoDuelo {
  if (!error) return { ok: true };
  const clave = Object.keys(MENSAJES).find((k) => error.message.includes(k));
  return { ok: false, mensaje: clave ? MENSAJES[clave] : "No se pudo. Prueba otra vez." };
}

export async function retar(leagueId: string, rivalId: string): Promise<ResultadoDuelo> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("lq_retar", { p_league_id: leagueId, p_rival: rivalId });
  revalidatePath("/quiniela-liga", "layout");
  return traducir(error);
}

export async function responderDuelo(id: string, aceptar: boolean): Promise<ResultadoDuelo> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("lq_responder_duelo", { p_id: id, p_aceptar: aceptar });
  revalidatePath("/quiniela-liga", "layout");
  return traducir(error);
}

export async function retirarDuelo(id: string): Promise<ResultadoDuelo> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("lq_retirar_duelo", { p_id: id });
  revalidatePath("/quiniela-liga", "layout");
  return traducir(error);
}
