"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notificarUsuario } from "@/lib/push/server";
import { miembrosConNombre } from "@/lib/quiniela-liga/chat-sistema";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { EMOJIS, REPORTES_PARA_OCULTAR, RITMO, filtrarTexto, type Emoji } from "@/lib/quiniela-liga/chat";

/**
 * Acciones del chat de la quiniela (migración 092). Todo lo escribe el
 * servidor con service role tras comprobar quién eres y que estás en la liga;
 * el navegador solo lee (RLS) y recibe en tiempo real.
 */

type Resultado = { ok: true } | { ok: false; error: string };

async function quienSoy() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function miembro(db: NonNullable<ReturnType<typeof clienteServicio>>, leagueId: string, userId: string) {
  const { data } = await db
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle<{ role: string }>();
  return data;
}

const MAX_MENCIONES = 10;

/**
 * Envía un mensaje. `menciones`: ids de los miembros elegidos con «@» en el
 * buscador; solo valen los de la liga cuyo «@nombre» sigue en el texto. A
 * cada mencionado le llega un aviso al móvil (27-oct).
 */
export async function enviarMensaje(leagueId: string, textoBruto: string, menciones: string[] = []): Promise<Resultado> {
  const user = await quienSoy();
  if (!user) return { ok: false, error: "Entra con tu cuenta para escribir." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo enviar." };
  if (!(await miembro(db, leagueId, user.id))) return { ok: false, error: "Solo pueden escribir los de esta liga." };
  const texto = filtrarTexto(textoBruto ?? "");
  if (!texto) return { ok: false, error: "El mensaje está vacío." };

  const desde = new Date(Date.now() - RITMO.segundos * 1000).toISOString();
  const { count } = await db
    .from("lq_chat")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", desde);
  if ((count ?? 0) >= RITMO.mensajes) return { ok: false, error: "Vas muy rápido: espera unos segundos." };

  const { data: perfil } = await db
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null; username: string | null }>();
  const autor = perfil?.display_name || perfil?.username || "Anónimo";

  // Menciones: miembros de la liga, nunca uno mismo, y con su «@nombre» en el texto.
  const pedidas = [...new Set(menciones)].filter((id) => id !== user.id).slice(0, MAX_MENCIONES);
  let mencionados: string[] = [];
  if (pedidas.length) {
    const minus = texto.toLowerCase();
    mencionados = (await miembrosConNombre(leagueId, pedidas))
      .filter((m) => minus.includes(`@${m.nombre.toLowerCase()}`))
      .map((m) => m.id);
  }

  const { error } = await db.from("lq_chat").insert({
    league_id: leagueId,
    user_id: user.id,
    autor,
    texto,
    menciones: mencionados,
  });
  if (error) return { ok: false, error: "No se pudo enviar." };

  if (mencionados.length) {
    // La pública es la liga por defecto: su enlace no lleva ?liga=.
    const { data: liga } = await db.from("leagues").select("is_public").eq("id", leagueId).maybeSingle<{ is_public: boolean }>();
    const url = liga?.is_public ? "/quiniela-liga/chat" : `/quiniela-liga/chat?liga=${encodeURIComponent(leagueId)}`;
    after(() =>
      Promise.all(
        mencionados.map((id) =>
          notificarUsuario(id, {
            title: `💬 ${autor} te ha mencionado`,
            body: texto.length > 120 ? `${texto.slice(0, 117)}…` : texto,
            url,
            tag: `chat-${leagueId}`,
          }).catch(() => 0),
        ),
      ),
    );
  }
  return { ok: true };
}

/** Pone o quita una reacción. */
export async function reaccionar(mensajeId: number, emoji: Emoji): Promise<Resultado> {
  if (!EMOJIS.includes(emoji)) return { ok: false, error: "Reacción no válida." };
  const user = await quienSoy();
  if (!user) return { ok: false, error: "Entra con tu cuenta." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo." };
  const { data: m } = await db.from("lq_chat").select("league_id").eq("id", mensajeId).maybeSingle<{ league_id: string }>();
  if (!m || !(await miembro(db, m.league_id, user.id))) return { ok: false, error: "No se pudo." };
  const clave = { mensaje_id: mensajeId, user_id: user.id, emoji };
  const { data: ya } = await db.from("lq_chat_reacciones").select("emoji").match(clave).maybeSingle();
  const { error } = ya
    ? await db.from("lq_chat_reacciones").delete().match(clave)
    : await db.from("lq_chat_reacciones").insert({ ...clave, league_id: m.league_id });
  return error ? { ok: false, error: "No se pudo." } : { ok: true };
}

/** Reporta un mensaje. Con REPORTES_PARA_OCULTAR reportes distintos, se oculta. */
export async function reportarMensaje(mensajeId: number): Promise<Resultado> {
  const user = await quienSoy();
  if (!user) return { ok: false, error: "Entra con tu cuenta." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo." };
  const { data: m } = await db.from("lq_chat").select("league_id").eq("id", mensajeId).maybeSingle<{ league_id: string }>();
  if (!m || !(await miembro(db, m.league_id, user.id))) return { ok: false, error: "No se pudo." };
  await db.from("lq_chat_reportes").upsert({ mensaje_id: mensajeId, user_id: user.id }, { onConflict: "mensaje_id,user_id", ignoreDuplicates: true });
  const { count } = await db.from("lq_chat_reportes").select("user_id", { count: "exact", head: true }).eq("mensaje_id", mensajeId);
  if ((count ?? 0) >= REPORTES_PARA_OCULTAR) await db.from("lq_chat").update({ oculto: true }).eq("id", mensajeId);
  return { ok: true };
}

/** Borra (oculta) un mensaje: su autor, un admin de la liga o de la web. */
export async function borrarMensaje(mensajeId: number): Promise<Resultado> {
  const user = await quienSoy();
  if (!user) return { ok: false, error: "Entra con tu cuenta." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo." };
  const { data: m } = await db
    .from("lq_chat")
    .select("league_id, user_id")
    .eq("id", mensajeId)
    .maybeSingle<{ league_id: string; user_id: string | null }>();
  if (!m) return { ok: false, error: "No se pudo." };
  const [rol, { data: perfil }] = await Promise.all([
    miembro(db, m.league_id, user.id),
    db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle<{ is_admin: boolean | null }>(),
  ]);
  const puede = m.user_id === user.id || rol?.role === "admin" || perfil?.is_admin === true;
  if (!puede) return { ok: false, error: "No puedes borrar este mensaje." };
  const { error } = await db.from("lq_chat").update({ oculto: true }).eq("id", mensajeId);
  return error ? { ok: false, error: "No se pudo." } : { ok: true };
}

/** Silencia (o deja de silenciar) a alguien: sus mensajes dejan de verse solo para ti. */
export async function silenciar(otroId: string, activar: boolean): Promise<Resultado> {
  const user = await quienSoy();
  if (!user || otroId === user.id) return { ok: false, error: "No se pudo." };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "No se pudo." };
  const fila = { user_id: user.id, silenciado: otroId };
  const { error } = activar
    ? await db.from("lq_chat_silencios").upsert(fila, { onConflict: "user_id,silenciado", ignoreDuplicates: true })
    : await db.from("lq_chat_silencios").delete().match(fila);
  return error ? { ok: false, error: "No se pudo." } : { ok: true };
}
