import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canalDelPartido } from "@/lib/push/actividad";

export const runtime = "nodejs";

/**
 * «Seguir en la pantalla de bloqueo» desde la ficha del partido, en la app
 * (iOS 18+). Devuelve lo que necesita la app para encender la actividad: el
 * canal del partido (lo crea si hace falta), los equipos y el marcador.
 *
 * Solo partidos EN JUEGO que sigue la ingesta (los de LaLiga, `lq_matches`):
 * si se creara el canal antes del pitido, la ingesta ya no encendería la
 * actividad sola a quien sigue a esos equipos (ver ingest).
 */
const EN_JUEGO = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "config" }, { status: 500 });
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: m } = await supabase
    .from("lq_matches")
    .select("id, status, live_minute, score_home, score_away, team_home, team_away, home:team_home(name), away:team_away(name)")
    .eq("id", id)
    .maybeSingle();
  const p = m as unknown as {
    id: number;
    status: string | null;
    live_minute: number | null;
    score_home: number | null;
    score_away: number | null;
    team_home: number;
    team_away: number;
    home: { name: string } | null;
    away: { name: string } | null;
  } | null;
  if (!p || !p.status || !EN_JUEGO.has(p.status)) {
    return NextResponse.json({ error: "no-en-juego" }, { status: 409 });
  }
  const c = await canalDelPartido(supabase, p.id);
  if (!c) return NextResponse.json({ error: "apns" }, { status: 502 });

  return NextResponse.json({
    canal: c.canal,
    atributos: {
      partidoId: p.id,
      local: p.home?.name ?? "Local",
      visitante: p.away?.name ?? "Visitante",
      localId: Number(p.team_home),
      visitanteId: Number(p.team_away),
    },
    estado: {
      gl: p.score_home ?? 0,
      gv: p.score_away ?? 0,
      estado: p.status,
      minuto: p.live_minute,
    },
  });
}
