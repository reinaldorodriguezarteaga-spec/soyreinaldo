import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWidgetData, type WidgetData } from "@/lib/sports/widget-data";

export const runtime = "nodejs";

/**
 * Endpoint ligero que devuelve el estado del widget de marcadores.
 * El cliente lo polea cada 30s solo cuando hay un partido en juego o a punto
 * de empezar y la pestaña está visible. Los datos vienen ya cacheados por la
 * librería (next.revalidate) — si el caché es fresco no llama a API-Football.
 *
 * Desde el 4-nov también lo lee el widget del iPhone justo después de que la
 * ingesta le pida recargar (push «widgets»): por eso el marcador de un partido
 * que la ingesta acaba de leer (lq_matches, cada minuto) pisa al de la caché,
 * que puede llevar hasta 30 s de retraso y no traer aún el gol.
 */
export async function GET() {
  try {
    const data = await getWidgetData();
    return NextResponse.json(await conMarcadorFresco(data));
  } catch {
    return NextResponse.json(
      { mode: "clubs", fixtures: [], needsPolling: false },
      { status: 200 },
    );
  }
}

type Fila = {
  id: number;
  status: string | null;
  live_minute: number | null;
  score_home: number | null;
  score_away: number | null;
  last_polled_at: string | null;
};

async function conMarcadorFresco(data: WidgetData): Promise<WidgetData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ids = data.fixtures.map((f) => f.fixture.id);
  if (!url || !key || ids.length === 0) return data;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data: filas } = await supabase
      .from("lq_matches")
      .select("id, status, live_minute, score_home, score_away, last_polled_at")
      .in("id", ids);
    const frescas = new Map(
      ((filas ?? []) as Fila[])
        .filter((f) => f.status && f.last_polled_at && Date.now() - Date.parse(f.last_polled_at) < 3 * 60_000)
        .map((f) => [f.id, f]),
    );
    if (frescas.size === 0) return data;
    return {
      ...data,
      fixtures: data.fixtures.map((f) => {
        const r = frescas.get(f.fixture.id);
        if (!r) return f;
        return {
          ...f,
          fixture: {
            ...f.fixture,
            status: { ...f.fixture.status, short: r.status as typeof f.fixture.status.short, elapsed: r.live_minute ?? f.fixture.status.elapsed },
          },
          goals: { home: r.score_home ?? f.goals.home, away: r.score_away ?? f.goals.away },
        };
      }),
    };
  } catch {
    return data;
  }
}
