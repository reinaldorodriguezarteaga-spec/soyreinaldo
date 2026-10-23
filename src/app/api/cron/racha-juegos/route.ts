import { NextResponse } from "next/server";
import { notificarUsuario } from "@/lib/push/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { numeroDelDia } from "@/lib/juegos/diario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "🔥 No pierdas la racha" (23-oct, pedido del dueño: que la gente vuelva a
 * los juegos). pg_cron `racha-juegos` (migración 090), 18:00 UTC: push a
 * quien jugó algún reto del día ayer y hoy todavía no. Solo push y solo a
 * quien no se dio de baja de avisos; no llama a API-Football.
 * `?simular=1` devuelve lo que enviaría.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = clienteServicio();
  if (!db) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  const simular = new URL(request.url).searchParams.get("simular") === "1";

  const hoy = numeroDelDia();
  const { data, error } = await db.rpc("juegos_rachas_en_peligro", { p_hoy: hoy });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const lista = (data ?? []) as { user_id: string; racha: number }[];
  if (simular) return NextResponse.json({ simulacion: true, dia: hoy, rachas: lista.map((l) => l.racha) });

  let enviados = 0;
  for (const { user_id, racha } of lista) {
    enviados += await notificarUsuario(
      user_id,
      {
        title: racha > 1 ? `🔥 Llevas ${racha} días seguidos` : "🎮 El reto de hoy te espera",
        body:
          racha > 1
            ? "Juega un reto del día antes de medianoche y no pierdas la racha."
            : "Ayer jugaste: haz el reto de hoy y empieza una racha.",
        url: "/juegos",
        tag: "racha-juegos",
      },
      // Caduca a medianoche, más o menos: un aviso de racha de ayer no sirve.
      5 * 3600,
    ).catch(() => 0);
  }
  return NextResponse.json({ ok: true, dia: hoy, avisados: lista.length, enviados });
}
