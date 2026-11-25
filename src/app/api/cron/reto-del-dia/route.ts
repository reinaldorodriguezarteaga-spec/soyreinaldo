import { NextResponse } from "next/server";
import { notificarUsuario } from "@/lib/push/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { numeroDelDia } from "@/lib/juegos/diario";
import { retoDelDia } from "@/lib/juegos/reto-del-dia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Aviso del reto del día (25-nov-2026, pedido del dueño: que la gente vuelva
 * a los juegos). pg_cron `reto-del-dia` (migración 119), 9:00 UTC: push con el
 * juego que toca hoy a quien tiene avisos y no jugó ayer (a los que jugaron
 * les llega el de la racha por la tarde). Solo push; no llama a API-Football.
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
  const reto = retoDelDia(hoy);
  const { data, error } = await db.rpc("juegos_aviso_reto", { p_hoy: hoy });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const usuarios = ((data ?? []) as { user_id: string }[]).map((u) => u.user_id);
  const aviso = {
    title: `🎮 Reto del día: ${reto.titulo}`,
    body: `${reto.corto}. Un juego nuevo cada día, gratis: ¿te atreves?`,
    url: reto.href,
    tag: "reto-del-dia",
  };
  if (simular) return NextResponse.json({ simulacion: true, dia: hoy, aviso, destinatarios: usuarios.length });

  let enviados = 0;
  for (const id of usuarios) {
    // Caduca en 10 h: por la noche ya llega, si acaso, el de la racha.
    enviados += await notificarUsuario(id, aviso, 10 * 3600).catch(() => 0);
  }
  return NextResponse.json({ ok: true, dia: hoy, juego: reto.juego, avisados: usuarios.length, enviados });
}
