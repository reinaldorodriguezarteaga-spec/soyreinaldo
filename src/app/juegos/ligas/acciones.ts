"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";

/**
 * Ligas privadas de los juegos (23-oct, pedido del dueño; migración 090): el
 * ranking de los retos del día solo con tus amigos. Se entra con un código de
 * 6 caracteres. Escribe solo el servidor con service role.
 */

type Resultado = { ok: true; id: string; codigo?: string } | { ok: false; error: string };

const MAX_CREADAS = 10;
const MAX_MIEMBRO = 30;
// Sin 0/O ni 1/I: el código se dicta por WhatsApp.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const codigoNuevo = () => Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");

async function usuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function crearLiga(nombreBruto: string): Promise<Resultado> {
  const user = await usuario();
  if (!user) return { ok: false, error: "Entra con tu cuenta para crear una liga." };
  const nombre = nombreBruto.trim().replace(/\s+/g, " ");
  if (nombre.length < 2 || nombre.length > 40) return { ok: false, error: "El nombre debe tener entre 2 y 40 caracteres." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo crear la liga." };

  const { count } = await db.from("juego_ligas").select("id", { count: "exact", head: true }).eq("creador", user.id);
  if ((count ?? 0) >= MAX_CREADAS) return { ok: false, error: `Ya has creado ${MAX_CREADAS} ligas.` };

  for (let intento = 0; intento < 5; intento++) {
    const codigo = codigoNuevo();
    const { data, error } = await db
      .from("juego_ligas")
      .insert({ codigo, nombre, creador: user.id })
      .select("id")
      .single<{ id: string }>();
    if (error?.code === "23505") continue; // código repetido: otro
    if (error || !data) return { ok: false, error: "No se pudo crear la liga." };
    await db.from("juego_liga_miembros").insert({ liga_id: data.id, user_id: user.id });
    revalidatePath("/juegos/ligas");
    return { ok: true, id: data.id, codigo };
  }
  return { ok: false, error: "No se pudo crear la liga." };
}

export async function unirseLiga(codigoBruto: string): Promise<Resultado> {
  const user = await usuario();
  if (!user) return { ok: false, error: "Entra con tu cuenta para unirte." };
  const codigo = codigoBruto.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(codigo)) return { ok: false, error: "El código tiene 6 letras o números." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo entrar en la liga." };

  const { data: liga } = await db.from("juego_ligas").select("id").eq("codigo", codigo).maybeSingle<{ id: string }>();
  if (!liga) return { ok: false, error: "No hay ninguna liga con ese código." };
  const { count: mias } = await db.from("juego_liga_miembros").select("liga_id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((mias ?? 0) >= MAX_MIEMBRO) return { ok: false, error: `Ya estás en ${MAX_MIEMBRO} ligas.` };
  const { error } = await db
    .from("juego_liga_miembros")
    .upsert({ liga_id: liga.id, user_id: user.id }, { onConflict: "liga_id,user_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: "No se pudo entrar en la liga." };
  revalidatePath("/juegos/ligas");
  return { ok: true, id: liga.id };
}

/** Salir de una liga. Si era el último miembro, la liga se borra. */
export async function salirLiga(ligaId: string): Promise<Resultado> {
  const user = await usuario();
  if (!user) return { ok: false, error: "Sin sesión." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo salir." };
  await db.from("juego_liga_miembros").delete().eq("liga_id", ligaId).eq("user_id", user.id);
  const { count } = await db.from("juego_liga_miembros").select("user_id", { count: "exact", head: true }).eq("liga_id", ligaId);
  if ((count ?? 0) === 0) await db.from("juego_ligas").delete().eq("id", ligaId);
  revalidatePath("/juegos/ligas");
  return { ok: true, id: ligaId };
}
