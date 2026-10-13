import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  allFixturesCacheKey,
  cuotaAgotada,
  enModoAhorro,
  isFinal,
  leerCuotaReal,
  refrescarEquipoTrasPartido,
  type Fixture,
} from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { readCache } from "@/lib/sports/sports-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Refresco tras cada partido (pg_cron `refresco-post-partido`, migración
 * 059, cada 10 min). Idea del dueño, 13-oct: que las fichas (equipo,
 * jugadores) se pongan al día según los resultados, no "cada X horas".
 *
 * Busca en el calendario YA guardado (`sports_cache`, lo escribe el cron de
 * caché cada 10 min; sin llamar a la API) los partidos de nuestras
 * competiciones terminados hace entre 2 h 30 min y 36 h desde el inicio —
 * para entonces la API ya ha cerrado estadísticas y notas— y que aún no se
 * hayan refrescado. Para cada uno refresca los dos equipos
 * (`refrescarEquipoTrasPartido`: ~6 llamadas por equipo) y lo apunta en
 * `refrescos_post_partido` para no repetirlo.
 *
 * NO toca el directo: es una ruta aparte, no lee ni escribe marcadores, y
 * sus llamadas van de una en una. Si la cuota aprieta de verdad (modo ahorro
 * o agotada), no hace nada y lo deja para la siguiente vuelta.
 *
 * ?simular=1 → dice qué partidos refrescaría, sin llamar ni apuntar.
 */
const MAX_PARTIDOS_POR_VUELTA = 8;
const DESDE_INICIO_MIN_MS = 150 * 60_000;
const DESDE_INICIO_MAX_MS = 36 * 3_600_000;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const simular = new URL(request.url).searchParams.get("simular") === "1";

  // 1. Candidatos, del calendario guardado.
  const ahora = Date.now();
  const candidatos: { fixture: Fixture; competition: (typeof COMPETITIONS)[number] }[] = [];
  for (const c of COMPETITIONS) {
    const fixtures = (await readCache<Fixture[]>(allFixturesCacheKey(c), 7 * 86_400)) ?? [];
    for (const f of fixtures) {
      const desdeInicio = ahora - Date.parse(f.fixture.date);
      if (isFinal(f) && desdeInicio >= DESDE_INICIO_MIN_MS && desdeInicio <= DESDE_INICIO_MAX_MS) {
        candidatos.push({ fixture: f, competition: c });
      }
    }
  }
  const ids = candidatos.map((x) => x.fixture.fixture.id);
  const { data: hechos } = ids.length
    ? await db.from("refrescos_post_partido").select("fixture_id").in("fixture_id", ids)
    : { data: [] };
  const yaHechos = new Set((hechos ?? []).map((h: { fixture_id: number }) => h.fixture_id));
  const pendientes = candidatos
    .filter((x) => !yaHechos.has(x.fixture.fixture.id))
    .sort((a, b) => Date.parse(a.fixture.fixture.date) - Date.parse(b.fixture.fixture.date))
    .slice(0, MAX_PARTIDOS_POR_VUELTA);

  if (simular) {
    return NextResponse.json({
      simulacion: true,
      candidatos: candidatos.length,
      pendientes: pendientes.map(
        (x) =>
          `${x.competition.slug} ${x.fixture.teams.home.name}-${x.fixture.teams.away.name} ${x.fixture.fixture.date}`,
      ),
    });
  }
  if (pendientes.length === 0) return NextResponse.json({ ok: true, refrescados: 0 });

  // 2. ¿Hay cuota de sobra? (dato real de /status, que no gasta).
  await leerCuotaReal();
  // El freno NO lo para: con el freno puesto las fichas viven de lo guardado,
  // y este refresco es justo lo que lo mantiene al día (y cuesta poco). Solo
  // se para en modo ahorro (reserva de 15.000) o sin cuota.
  if (cuotaAgotada() || enModoAhorro()) {
    return NextResponse.json({ ok: true, refrescados: 0, pospuesto: "cuota justa" });
  }

  // 3. Refrescar, de uno en uno.
  let llamadas = 0;
  const hechosAhora: number[] = [];
  for (const { fixture: f, competition: c } of pendientes) {
    if (enModoAhorro()) break;
    const n =
      (await refrescarEquipoTrasPartido(f.teams.home.id, c)) +
      (await refrescarEquipoTrasPartido(f.teams.away.id, c));
    llamadas += n;
    await db
      .from("refrescos_post_partido")
      .upsert({ fixture_id: f.fixture.id, competition: c.slug, llamadas: n });
    hechosAhora.push(f.fixture.id);
  }
  console.log(`[refresco-post-partido] ${hechosAhora.length} partidos, ${llamadas} llamadas`);
  return NextResponse.json({ ok: true, refrescados: hechosAhora.length, llamadas });
}
