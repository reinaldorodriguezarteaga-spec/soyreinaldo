import "server-only";
import { Resend } from "resend";
import { notificarUsuario } from "@/lib/push/server";
import { clienteServicio } from "./jornada-datos";

/**
 * Aviso de duelos (17-oct, pedido del dueño): sin él, quien recibe un reto
 * no se entera si no entra a la web, y el reto caduca al empezar la jornada.
 *
 *  - Reto nuevo → al retado, push + email (si no se dio de baja de avisos).
 *  - Reto aceptado → al retador, solo push.
 *
 * Nunca rompe la acción que lo llama: cualquier fallo se traga.
 */

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cuando = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function emailReto(opts: {
  nombre: string;
  retador: string;
  jornada: number;
  cierre: string | null;
  url: string;
  urlBaja: string;
}): { subject: string; html: string } {
  const subject = `⚔️ ${opts.retador} te reta en la jornada ${opts.jornada}`;
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;background:#0a1030;color:#e8ecff;padding:28px;border-radius:16px;max-width:460px;margin:auto">
  <h2 style="margin:0 0 8px;font-size:20px">Hola, ${esc(opts.nombre)}</h2>
  <p style="margin:0 0 14px;color:#c5cbef"><strong style="color:#e8ecff">${esc(opts.retador)}</strong> te ha retado a un duelo en la jornada ${opts.jornada}: gana quien más puntos saque en ella.${
    opts.cierre ? ` Puedes aceptarlo hasta el <strong style="color:#e8ecff">${esc(cuando(opts.cierre))}</strong>, cuando empieza la jornada.` : ""
  }</p>
  <p style="margin:0 0 18px;color:#c5cbef">Quien más duelos gane en la temporada suma 40 puntos a la general.</p>
  <a href="${opts.url}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Aceptar o rechazar ⚔️</a>
  <p style="margin:22px 0 0;color:#7c84b8;font-size:12px">Recibes esto porque juegas en soyreinaldo.com. <a href="${opts.urlBaja}" style="color:#9aa4d6">No quiero más avisos</a>.</p>
</div>`;
  return { subject, html };
}

type DueloFila = { id: string; league_id: string; matchday: number; retador: string; rival: string };

async function cargar(dueloId: string) {
  const db = clienteServicio();
  if (!db) return null;
  const { data: d } = await db
    .from("lq_duelos")
    .select("id, league_id, matchday, retador, rival")
    .eq("id", dueloId)
    .maybeSingle<DueloFila>();
  if (!d) return null;
  const { data: perfiles } = await db
    .from("profiles")
    .select("id, display_name, username, wants_reminders, unsubscribe_token")
    .in("id", [d.retador, d.rival])
    .returns<
      { id: string; display_name: string | null; username: string | null; wants_reminders: boolean | null; unsubscribe_token: string | null }[]
    >();
  const p = (id: string) => (perfiles ?? []).find((x) => x.id === id);
  return { db, d, retador: p(d.retador), rival: p(d.rival) };
}

const nombreDe = (p?: { display_name: string | null; username: string | null }) =>
  p?.display_name || p?.username || "Alguien";

export async function avisarRetoNuevo(dueloId: string): Promise<void> {
  try {
    const c = await cargar(dueloId);
    if (!c) return;
    const { db, d, retador, rival } = c;
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.soyreinaldo.com";
    const ruta = `/quiniela-liga/ranking?vista=duelos&liga=${encodeURIComponent(d.league_id)}`;
    const quien = nombreDe(retador);

    await notificarUsuario(d.rival, {
      title: `⚔️ ${quien} te reta`,
      body: `Duelo en la jornada ${d.matchday}: acéptalo antes de que empiece.`,
      url: ruta,
      tag: `reto-${d.id}`,
    }).catch(() => 0);

    if (!rival || rival.wants_reminders === false || !rival.unsubscribe_token) return;
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;
    const [{ data: u }, { data: primero }] = await Promise.all([
      db.auth.admin.getUserById(d.rival),
      db
        .from("lq_matches")
        .select("kickoff_at")
        .eq("matchday", d.matchday)
        .eq("counts_for_scoring", true)
        .order("kickoff_at")
        .limit(1)
        .returns<{ kickoff_at: string }[]>(),
    ]);
    const email = u?.user?.email;
    if (!email) return;
    const { subject, html } = emailReto({
      nombre: nombreDe(rival),
      retador: quien,
      jornada: d.matchday,
      cierre: primero?.[0]?.kickoff_at ?? null,
      url: `${site}${ruta}`,
      urlBaja: `${site}/baja-recordatorios?token=${rival.unsubscribe_token}`,
    });
    await new Resend(resendKey).emails.send({
      from: "Reinaldo <hola@soyreinaldo.com>",
      to: [email],
      subject,
      html,
    });
  } catch {
    // El reto ya está creado; el aviso es un extra.
  }
}

export async function avisarRetoAceptado(dueloId: string): Promise<void> {
  try {
    const c = await cargar(dueloId);
    if (!c) return;
    await notificarUsuario(c.d.retador, {
      title: "⚔️ Reto aceptado",
      body: `${nombreDe(c.rival)} acepta el duelo de la jornada ${c.d.matchday}. ¡A por él!`,
      url: `/quiniela-liga/ranking?vista=duelos&liga=${encodeURIComponent(c.d.league_id)}`,
      tag: `reto-${c.d.id}`,
    });
  } catch {
    // Igual que arriba.
  }
}
