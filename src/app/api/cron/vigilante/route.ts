import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vigilante de los crons.
 *
 * El 18-ago descubrimos por casualidad que la ingesta llevaba DÍAS muerta:
 * LaLiga había arrancado el 15 con 380 partidos y ninguno tenía marcador,
 * y `sports_cache` no se escribía desde el día 13 (con lo que cada visita
 * volvía a llamar a API-Football en vivo, que es justo lo que quema la
 * cuota). Nadie se enteró porque un cron que deja de correr no hace ruido:
 * simplemente no pasa nada.
 *
 * Esto es lo que hace ruido. Comprueba tres cosas y, solo si algo falla,
 * manda un correo. Si todo va bien no envía nada — un vigilante que avisa
 * cuando todo está bien se acaba ignorando.
 */

const AVISAR_A = "reinaldo_r@live.com";

/** Caché: el cron la refresca cada 10 min; a los 45 algo pasa. */
const CACHE_MAX_MIN = 45;
/** Un partido que acabó hace más de 4h y sigue sin marcador se perdió. */
const PARTIDO_SIN_MARCADOR_H = 4;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const problemas: string[] = [];

  // 1. ¿Se está refrescando la caché de deportes?
  const { data: cache } = await supabase
    .from("sports_cache")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ updated_at: string }>();

  if (!cache) {
    problemas.push("`sports_cache` está vacía: el cron de caché no ha escrito nunca.");
  } else {
    const min = Math.round(
      (Date.now() - new Date(cache.updated_at).getTime()) / 60000,
    );
    if (min > CACHE_MAX_MIN) {
      problemas.push(
        `La caché de deportes lleva ${min} min sin refrescarse (debería ser cada 10). ` +
          `Cada visita a la portada está llamando a API-Football en vivo.`,
      );
    }
  }

  // 2. ¿Se quedó algún partido sin marcador?
  const limite = new Date(
    Date.now() - PARTIDO_SIN_MARCADOR_H * 60 * 60 * 1000,
  ).toISOString();
  const { data: huerfanos } = await supabase
    .from("lq_matches")
    .select("id, kickoff_at")
    .eq("finished", false)
    .lt("kickoff_at", limite)
    .order("kickoff_at", { ascending: false })
    .limit(20)
    .returns<{ id: number; kickoff_at: string }[]>();

  // Los aplazados salen aquí hasta que el cron de fechas los recoloca, así
  // que solo avisamos si son varios: uno suelto es ruido esperable.
  if ((huerfanos?.length ?? 0) > 2) {
    problemas.push(
      `${huerfanos!.length} partidos acabaron hace más de ${PARTIDO_SIN_MARCADOR_H}h y ` +
        `siguen sin marcador (ids: ${huerfanos!.map((m) => m.id).join(", ")}). ` +
        `La ingesta no los vio. Se recuperan con: ` +
        `node scripts/backfill-lq-results.mjs --all-past`,
    );
  }

  // 3. ¿Están programados los tres crons?
  const { data: jobsRaw } = await supabase.rpc("cron_jobs_activos");
  const jobs = (jobsRaw ?? null) as { jobname: string }[] | null;
  if (jobs) {
    const esperados = ["ingesta-marcadores", "cache-deportes", "fechas-lq"];
    const faltan = esperados.filter(
      (e) => !jobs.some((j) => j.jobname === e),
    );
    if (faltan.length > 0) {
      problemas.push(
        `Estos crons ya no están programados o están desactivados: ${faltan.join(", ")}. ` +
          `Se reponen aplicando supabase/migrations/038 y 043.`,
      );
    }
  }

  if (problemas.length === 0) {
    return NextResponse.json({ ok: true, problemas: 0 });
  }

  // Hay algo roto: avisar.
  const resendKey = process.env.RESEND_API_KEY;
  let avisado = false;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const html = `
      <p>El vigilante ha encontrado ${problemas.length} problema(s) en soyreinaldo.com:</p>
      <ul>${problemas.map((p) => `<li>${p}</li>`).join("")}</ul>
      <p style="color:#666;font-size:13px">
        Este correo solo se envía cuando algo falla. Si no llega nada, todo va bien.
      </p>`;
    const { error } = await resend.emails.send({
      from: "Vigilante <hola@soyreinaldo.com>",
      to: [AVISAR_A],
      subject: `⚠️ soyreinaldo: ${problemas.length} problema(s) en los crons`,
      html,
    });
    avisado = !error;
  }

  return NextResponse.json({ ok: false, problemas, avisado });
}
