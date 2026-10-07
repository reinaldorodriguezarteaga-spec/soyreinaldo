import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { notificarUsuario } from "@/lib/push/server";
import {
  emailRecordatorio,
  pendientesPorUsuario,
  type PartidoProximo,
} from "@/lib/quiniela-liga/recordatorio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Recordatorio diario de la quiniela. Lo lanza pg_cron (`recordatorio-quiniela`,
 * migración 055) a las 08:00 UTC = 10:00 en España con horario de verano.
 * Ver `lib/quiniela-liga/recordatorio.ts`.
 *
 * Solo a quien JUEGA (algún pronóstico en los últimos 60 días) y no se ha
 * dado de baja (`profiles.wants_reminders`): los 170+ registrados que nunca
 * jugaron no reciben nada. Un aviso al día como máximo, por email y, si lo
 * tiene activado, push.
 */
const VENTANA_H = 24;
const ACTIVO_DIAS = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.soyreinaldo.com";
  if (!url || !service) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }
  const db = createClient(url, service, { auth: { persistSession: false } });

  // ?simular=1 → calcula todo y devuelve lo que enviaría, SIN enviar nada
  // (para probarlo contra la base de datos real). `horas` solo en simulación.
  const q = new URL(request.url).searchParams;
  const simular = q.get("simular") === "1";
  const ventanaH = simular ? Number(q.get("horas") ?? VENTANA_H) || VENTANA_H : VENTANA_H;

  // 1. Partidos que empiezan en las próximas 24 h.
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + ventanaH * 3_600_000);
  const { data: proximos } = await db
    .from("lq_matches")
    .select("id, kickoff_at, home:team_home(name), away:team_away(name)")
    .eq("finished", false)
    .gt("kickoff_at", ahora.toISOString())
    .lte("kickoff_at", hasta.toISOString())
    .order("kickoff_at")
    .returns<
      { id: number; kickoff_at: string; home: { name: string } | null; away: { name: string } | null }[]
    >();
  const partidos: PartidoProximo[] = (proximos ?? []).map((m) => ({
    id: m.id,
    kickoffAt: m.kickoff_at,
    local: m.home?.name ?? "Local",
    visitante: m.away?.name ?? "Visitante",
  }));
  if (partidos.length === 0) {
    return NextResponse.json({ ok: true, partidos: 0, enviados: 0 });
  }

  // 2. Jugadores activos que no se han dado de baja.
  const desde = new Date(ahora.getTime() - ACTIVO_DIAS * 86_400_000).toISOString();
  const { data: activos } = await db
    .from("lq_predictions")
    .select("user_id")
    .gte("updated_at", desde)
    .returns<{ user_id: string }[]>();
  const idsActivos = [...new Set((activos ?? []).map((a) => a.user_id))];
  if (idsActivos.length === 0) {
    return NextResponse.json({ ok: true, partidos: partidos.length, enviados: 0 });
  }
  const { data: perfiles } = await db
    .from("profiles")
    .select("id, display_name, username, wants_reminders, unsubscribe_token")
    .in("id", idsActivos)
    .returns<
      {
        id: string;
        display_name: string | null;
        username: string | null;
        wants_reminders: boolean | null;
        unsubscribe_token: string | null;
      }[]
    >();
  const avisables = (perfiles ?? []).filter((p) => p.wants_reminders !== false);

  // 3. Qué les falta.
  const { data: hechos } = await db
    .from("lq_predictions")
    .select("user_id, match_id")
    .in("match_id", partidos.map((p) => p.id))
    .in("user_id", avisables.map((p) => p.id))
    .returns<{ user_id: string; match_id: number }[]>();
  const pendientes = pendientesPorUsuario(
    partidos,
    (hechos ?? []).map((h) => ({ userId: h.user_id, matchId: h.match_id })),
    avisables.map((p) => p.id),
  );

  if (simular) {
    return NextResponse.json({
      simulacion: true,
      partidos: partidos.map((m) => `${m.local}-${m.visitante} ${m.kickoffAt}`),
      jugadoresActivos: idsActivos.length,
      avisables: avisables.length,
      conPendientes: pendientes.size,
      pendientesPorJugador: [...pendientes.values()].map((l) => l.length),
    });
  }

  // 4. Enviar.
  const resend = resendKey ? new Resend(resendKey) : null;
  let emails = 0;
  let pushes = 0;
  let errores = 0;
  for (const perfil of avisables) {
    const faltan = pendientes.get(perfil.id);
    if (!faltan) continue;
    const nombre = perfil.display_name || perfil.username || "crack";
    const urlPronosticar = `${site}/quiniela-liga/partidos`;

    try {
      pushes += await notificarUsuario(perfil.id, {
        title: "⚽ Quiniela: te faltan pronósticos",
        body:
          faltan.length === 1
            ? `${faltan[0].local} - ${faltan[0].visitante} empieza hoy. ¡No te quedes sin puntos!`
            : `Hoy hay ${faltan.length} partidos que aún no has pronosticado.`,
        url: "/quiniela-liga/partidos",
        tag: `recordatorio-${ahora.toISOString().slice(0, 10)}`,
      });
    } catch {
      errores++;
    }

    if (!resend || !perfil.unsubscribe_token) continue;
    const { data: usuario } = await db.auth.admin.getUserById(perfil.id);
    const email = usuario?.user?.email;
    if (!email) continue;
    const { subject, html } = emailRecordatorio({
      nombre,
      partidos: faltan,
      urlPronosticar,
      urlBaja: `${site}/baja-recordatorios?token=${perfil.unsubscribe_token}`,
    });
    const { error } = await resend.emails.send({
      from: "Reinaldo <hola@soyreinaldo.com>",
      to: [email],
      subject,
      html,
    });
    if (error) errores++;
    else emails++;
  }

  return NextResponse.json({
    ok: errores === 0,
    partidos: partidos.length,
    jugadores: avisables.length,
    conPendientes: pendientes.size,
    emails,
    pushes,
    errores,
  });
}
