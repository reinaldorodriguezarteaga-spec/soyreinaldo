import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  buildReminderEmail,
  type PendingMatch,
} from "@/lib/quiniela/reminder-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderRow = {
  user_id: string;
  email: string;
  display_name: string;
  unsubscribe_token: string;
  pending: PendingMatch[];
};

/**
 * Cron de Vercel diario.
 *
 * Cada noche (cron schedule "0 21 * * *" → 22:00 Madrid en verano):
 *  - Busca usuarios con wants_reminders=true
 *  - Para cada uno, lista los partidos sin pronosticar en las próx. 30h
 *  - Si hay alguno → email diario
 *  - Si además es domingo → email semanal con próx. 7 días
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}` (Vercel lo manda solo).
 */
export async function GET(request: Request) {
  // 1. Auth con CRON_SECRET (Vercel cron lo añade automáticamente)
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.soyreinaldo.com";

  if (!supabaseUrl || !serviceRoleKey || !resendKey) {
    return NextResponse.json(
      {
        error: "Missing env vars",
        missing: [
          !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
          !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
          !resendKey && "RESEND_API_KEY",
        ].filter(Boolean),
      },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const resend = new Resend(resendKey);

  const isSunday = new Date().getUTCDay() === 0;
  const reportLines: string[] = [];

  // ---- DAILY (próximas 30 horas) ----
  const daily = await sendBatch({
    supabase,
    resend,
    windowHours: 30,
    isWeekly: false,
    siteUrl,
  });
  reportLines.push(`daily: enviados ${daily.sent} / errores ${daily.errors}`);

  // ---- WEEKLY (próximos 7 días, solo domingos) ----
  if (isSunday) {
    const weekly = await sendBatch({
      supabase,
      resend,
      windowHours: 24 * 7,
      isWeekly: true,
      siteUrl,
    });
    reportLines.push(
      `weekly: enviados ${weekly.sent} / errores ${weekly.errors}`,
    );
  } else {
    reportLines.push("weekly: skipped (no es domingo UTC)");
  }

  return NextResponse.json({
    ok: true,
    report: reportLines,
  });
}

async function sendBatch({
  supabase,
  resend,
  windowHours,
  isWeekly,
  siteUrl,
}: {
  supabase: SupabaseClient;
  resend: Resend;
  windowHours: number;
  isWeekly: boolean;
  siteUrl: string;
}): Promise<{ sent: number; errors: number }> {
  const { data, error } = await supabase.rpc("get_pending_reminders", {
    p_window_hours: windowHours,
  });

  if (error) {
    console.error("RPC error:", error);
    return { sent: 0, errors: 1 };
  }

  const rows = (data ?? []) as ReminderRow[];
  let sent = 0;
  let errors = 0;

  for (const r of rows) {
    if (!r.email || !r.pending || r.pending.length === 0) continue;

    const unsubscribeUrl = `${siteUrl}/baja-recordatorios?token=${r.unsubscribe_token}`;
    const predictUrl = `${siteUrl}/quiniela/partidos`;

    const { subject, html } = buildReminderEmail({
      displayName: r.display_name || "amigo",
      matches: r.pending,
      unsubscribeUrl,
      predictUrl,
      isWeekly,
    });

    try {
      await resend.emails.send({
        from: "Reinaldo <hola@soyreinaldo.com>",
        to: [r.email],
        subject,
        html,
      });
      sent += 1;
    } catch (e) {
      console.error(`Email failed for ${r.email}:`, e);
      errors += 1;
    }
  }

  return { sent, errors };
}
