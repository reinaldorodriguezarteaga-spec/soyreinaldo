import { NextResponse } from "next/server";
import { Resend } from "resend";
import { notificarUsuario } from "@/lib/push/server";
import { clienteServicio, datosJornada } from "@/lib/quiniela-liga/jornada-datos";
import { emailResumenJornada } from "@/lib/quiniela-liga/recordatorio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Resumen de jornada de la quiniela (pg_cron `resumen-jornada`, migración
 * 055, 07:30 UTC). Cuando una jornada ha terminado del todo (los aplazados no
 * cuentan) en los últimos días y aún no se ha avisado, manda a cada jugador
 * sus puntos, aciertos, puesto en la liga pública y cuánto ha subido o
 * bajado, con el enlace a su tarjeta para compartir (/mi-jornada).
 *
 * Una vez por jornada: se apunta en `lq_resumenes_enviados` ANTES de enviar,
 * así que aunque el cron se ejecute dos veces nadie lo recibe repetido.
 *
 * ?simular=1 calcula y devuelve lo que enviaría sin enviar ni apuntar nada;
 * con &jornada=N se puede previsualizar una jornada concreta.
 */
const DIAS_RECIENTE = 4;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.soyreinaldo.com";
  const q = new URL(request.url).searchParams;
  const simular = q.get("simular") === "1";
  const forzada = simular && q.get("jornada") ? Number(q.get("jornada")) : null;

  // 1. Jornadas candidatas.
  const { data: filas } = await db
    .from("lq_matches")
    .select("competition, season, matchday, finished, status, kickoff_at")
    .eq("counts_for_scoring", true)
    .returns<
      {
        competition: string;
        season: number;
        matchday: number;
        finished: boolean;
        status: string | null;
        kickoff_at: string;
      }[]
    >();
  const grupos = new Map<string, NonNullable<typeof filas>>();
  for (const f of filas ?? []) {
    const k = `${f.competition}|${f.season}|${f.matchday}`;
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  const limite = Date.now() - DIAS_RECIENTE * 86_400_000;
  const candidatas = [...grupos.values()]
    .filter((g) => {
      if (forzada != null) return g[0].matchday === forzada;
      const vivos = g.filter((m) => m.status !== "PST");
      const terminados = vivos.filter((m) => m.finished);
      if (terminados.length === 0 || terminados.length < vivos.length) return false;
      const ultimo = Math.max(...terminados.map((m) => Date.parse(m.kickoff_at)));
      return ultimo >= limite;
    })
    .map((g) => ({ competition: g[0].competition, season: g[0].season, matchday: g[0].matchday }));

  const informe: unknown[] = [];
  for (const j of candidatas) {
    if (!simular) {
      // Apuntar primero: si ya estaba, otra ejecución la envió.
      const { error } = await db.from("lq_resumenes_enviados").insert(j);
      if (error) continue;
    }
    const datos = await datosJornada(db, j.competition, j.season, j.matchday);
    if (!datos) continue;

    const ids = [...datos.porJugador.keys()];
    const { data: perfiles } = await db
      .from("profiles")
      .select("id, display_name, username, wants_reminders, unsubscribe_token")
      .in("id", ids)
      .returns<
        {
          id: string;
          display_name: string | null;
          username: string | null;
          wants_reminders: boolean | null;
          unsubscribe_token: string | null;
        }[]
      >();

    if (simular) {
      informe.push({
        jornada: j.matchday,
        esUltima: datos.esUltima,
        jugadores: [...datos.porJugador.values()]
          .sort((a, b) => b.puntos - a.puntos)
          .map((r) => ({
            puntos: r.puntos,
            exactos: r.exactos,
            puestoAhora: r.puestoAhora,
            puestoAntes: datos.esUltima ? r.puestoAntes : null,
          })),
      });
      continue;
    }

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    let emails = 0;
    let pushes = 0;
    for (const p of perfiles ?? []) {
      if (p.wants_reminders === false) continue;
      const r = datos.porJugador.get(p.id);
      if (!r) continue;
      const nombre = p.display_name || p.username || "crack";
      const urlTarjeta = `${site}/mi-jornada/${encodeURIComponent(p.username || p.id)}/${j.matchday}`;
      try {
        pushes += await notificarUsuario(
          p.id,
          {
            title: `🏆 Jornada ${j.matchday}: ${r.puntos} puntos`,
            body: r.puestoAhora ? `Vas ${r.puestoAhora}º de ${r.totalJugadores}. ¡Compártelo!` : "¡Compártelo!",
            url: `/mi-jornada/${encodeURIComponent(p.username || p.id)}/${j.matchday}`,
            tag: `resumen-${j.matchday}`,
          },
          2 * 86_400,
        );
      } catch {
        // best-effort
      }
      if (!resend || !p.unsubscribe_token) continue;
      const { data: u } = await db.auth.admin.getUserById(p.id);
      const email = u?.user?.email;
      if (!email) continue;
      const { subject, html } = emailResumenJornada({
        nombre,
        jornada: j.matchday,
        liga: datos.liga.nombre,
        puntos: r.puntos,
        exactos: r.exactos,
        aciertos: r.aciertos,
        jugados: r.jugados,
        puestoAhora: r.puestoAhora,
        puestoAntes: datos.esUltima ? r.puestoAntes : r.puestoAhora,
        totalJugadores: r.totalJugadores,
        urlTarjeta,
        urlClasificacion: `${site}/quiniela-liga/ranking`,
        urlBaja: `${site}/baja-recordatorios?token=${p.unsubscribe_token}`,
      });
      const { error } = await resend.emails.send({
        from: "Reinaldo <hola@soyreinaldo.com>",
        to: [email],
        subject,
        html,
      });
      if (!error) emails++;
    }
    informe.push({ jornada: j.matchday, emails, pushes });
  }

  return NextResponse.json({ ok: true, simulacion: simular, candidatas: candidatas.length, informe });
}
