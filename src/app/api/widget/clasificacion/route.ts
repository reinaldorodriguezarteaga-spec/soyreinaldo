import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sinQuiniela } from "@/lib/termino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Datos del widget «Clasificación» del iPhone (4-nov-2026): tu puesto, tus
 * puntos y los de arriba en tu liga (la general si estás en ella; si no, la
 * primera privada). Se pide con la llave del widget (migración 108), no con
 * sesión. Sin la palabra «quiniela»: lo enseña la app.
 *
 *   GET /api/widget/clasificacion?t=<uuid>
 */
type Fila = { user_id: string; display_name: string | null; total_points: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!UUID.test(t)) return NextResponse.json({ error: "token" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ error: "env" }, { status: 500 });
  const db = createClient(url, service, { auth: { persistSession: false } });

  const { data: llave } = await db
    .from("widget_tokens")
    .select("user_id")
    .eq("token", t)
    .maybeSingle<{ user_id: string }>();
  if (!llave) return NextResponse.json({ error: "token" }, { status: 404 });

  const { data: ligas } = await db
    .from("league_members")
    .select("leagues!inner(id, name, is_public, kind, created_at)")
    .eq("user_id", llave.user_id)
    .eq("leagues.kind", "clubs")
    .returns<{ leagues: { id: string; name: string; is_public: boolean; created_at: string } }[]>();
  const liga = (ligas ?? [])
    .map((l) => l.leagues)
    .sort((a, b) => Number(b.is_public) - Number(a.is_public) || a.created_at.localeCompare(b.created_at))[0];
  if (!liga) return NextResponse.json({ liga: null });

  const { data } = await db.rpc("lq_leaderboard", { p_league_id: liga.id });
  const filas = ((data ?? []) as Fila[]).sort((a, b) => b.total_points - a.total_points);
  // Empatados, mismo puesto (como en la clasificación de la web).
  const puesto = (pts: number) => 1 + filas.filter((f) => f.total_points > pts).length;
  const yo = filas.find((f) => f.user_id === llave.user_id);

  return NextResponse.json(
    {
      liga: sinQuiniela(liga.name),
      jugadores: filas.length,
      yo: yo ? { puesto: puesto(yo.total_points), puntos: yo.total_points } : null,
      lider: filas[0] ? { nombre: filas[0].display_name ?? "—", puntos: filas[0].total_points } : null,
      top: filas.slice(0, 5).map((f) => ({
        puesto: puesto(f.total_points),
        nombre: f.display_name ?? "—",
        puntos: f.total_points,
        soyYo: f.user_id === llave.user_id,
      })),
    },
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
