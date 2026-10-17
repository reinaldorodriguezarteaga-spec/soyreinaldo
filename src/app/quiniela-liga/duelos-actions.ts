"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { avisarRetoAceptado, avisarRetoNuevo } from "@/lib/quiniela-liga/aviso-reto";

/**
 * Duelos de la quiniela: las reglas (próxima jornada sin empezar, miembros
 * de la liga, máximo de retos) las validan las RPC de la migración 070.
 */

export type ResultadoDuelo = { ok: true } | { ok: false; mensaje: string };

const MENSAJES: Record<string, string> = {
  sin_sesion: "Inicia sesión para retar.",
  a_ti_mismo: "No puedes retarte a ti mismo.",
  sin_jornada: "No hay ninguna jornada por empezar.",
  no_miembro: "Esta liga es privada: entra antes con su código.",
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
  const { data: id, error } = await supabase.rpc("lq_retar", { p_league_id: leagueId, p_rival: rivalId });
  // Aviso al retado (push + email) después de responder: no hace esperar.
  if (!error && typeof id === "string") after(() => avisarRetoNuevo(id));
  revalidatePath("/quiniela-liga", "layout");
  return traducir(error);
}

export async function responderDuelo(id: string, aceptar: boolean): Promise<ResultadoDuelo> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("lq_responder_duelo", { p_id: id, p_aceptar: aceptar });
  if (!error && aceptar) after(() => avisarRetoAceptado(id));
  revalidatePath("/quiniela-liga", "layout");
  return traducir(error);
}

export async function retirarDuelo(id: string): Promise<ResultadoDuelo> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("lq_retirar_duelo", { p_id: id });
  revalidatePath("/quiniela-liga", "layout");
  return traducir(error);
}

/** Aceptar un reto recibido por enlace (/reto/<usuario>): el duelo nace aceptado. */
export async function aceptarInvitacion(leagueId: string, retadorId: string): Promise<ResultadoDuelo> {
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("lq_aceptar_invitacion", {
    p_league_id: leagueId,
    p_retador: retadorId,
  });
  if (!error && typeof id === "string") after(() => avisarRetoAceptado(id));
  revalidatePath("/quiniela-liga", "layout");
  return traducir(error);
}
