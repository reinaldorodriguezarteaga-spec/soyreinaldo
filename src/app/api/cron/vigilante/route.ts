import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { COMPETITIONS } from "@/lib/sports/competitions";

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
 * Esto es lo que hace ruido. Comprueba cinco cosas cada 30 min y, solo si
 * algo falla, manda un correo (el mismo, como mucho cada 6 h). Si todo va
 * bien no envía nada — un vigilante que avisa cuando todo está bien se acaba
 * ignorando.
 */

const AVISAR_A = "reinaldo_r@live.com";

/** Caché: el cron la refresca cada 10 min; a los 45 algo pasa. */
const CACHE_MAX_MIN = 45;
/** Un partido que acabó hace más de 4h y sigue sin marcador se perdió. */
const PARTIDO_SIN_MARCADOR_H = 4;

/** Margen sobre el ritmo uniforme (100% a las 24:00 UTC) antes de avisar. */
const CUOTA_MARGEN_PUNTOS = 15;
const CUOTA_ALERTA_PCT = 85;
/** El mismo aviso no se repite antes de estas horas (salvo que cambie). */
const REPETIR_AVISO_H = 6;

/** Texto del problema, o null si la cuota va bien (o no se pudo consultar). */
async function revisarCuota(): Promise<string | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://v3.football.api-sports.io/status", {
      headers: { "x-apisports-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as {
      errors?: unknown;
      response?: { requests?: { current: number; limit_day: number } };
    };
    const errs = json.errors;
    if (errs && typeof errs === "object" && !Array.isArray(errs) && "requests" in errs) {
      return (
        "La cuota diaria de API-Football está AGOTADA: marcadores, quiniela y fichas no " +
        "pueden refrescarse hasta las 00:00 UTC. Casi siempre es un robot recorriendo fichas: " +
        "busca las líneas [ficha] en los logs de Vercel."
      );
    }
    const req = json.response?.requests;
    if (!req || !req.limit_day) return null;
    const pct = (req.current / req.limit_day) * 100;
    const ahora = new Date();
    const pctDia = ((ahora.getUTCHours() * 60 + ahora.getUTCMinutes()) / (24 * 60)) * 100;
    if (pct >= CUOTA_ALERTA_PCT || pct > pctDia + CUOTA_MARGEN_PUNTOS) {
      return (
        `La cuota de API-Football va demasiado rápida: ${req.current.toLocaleString("es-ES")} de ` +
        `${req.limit_day.toLocaleString("es-ES")} (${pct.toFixed(0)}%) cuando el día lleva un ` +
        `${pctDia.toFixed(0)}%. El freno automático ya sirve las fichas de jugadores y ` +
        `equipos desde lo guardado (partidos y directo siguen normales), pero casi seguro ` +
        `hay un robot nuevo: busca en las métricas de Vercel la huella TLS (JA4) que más ` +
        `fichas pide y bloquéala en el firewall.`
      );
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * ¿Hay temporada nueva en el API? (13-oct-2026). Las competiciones llevan la
 * temporada escrita en `competitions.ts` y hay que subirla a mano: las copas
 * cada verano (el 9-oct seguían en la edición terminada y su calendario salía
 * vacío), las eliminatorias del Mundial 2030 cuando se publiquen… Una vez al
 * día se pregunta al API por cada una (`/leagues?id=`, ~18 llamadas) y se
 * avisa si la temporada marcada como actual es más nueva que la nuestra.
 * También avisa cuando aparezca la clasificación a la Euro 2028 (id 960),
 * que aún no está en la web porque no existía.
 */
const EURO_CLASIFICACION = { id: 960, ultimaConocida: 2023 };

async function revisarTemporadas(): Promise<string | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;
  const leer = async (id: number) => {
    const r = await fetch(`https://v3.football.api-sports.io/leagues?id=${id}`, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const j = (await r.json()) as {
      response?: { seasons: { year: number; current: boolean }[] }[];
    };
    const seasons = j.response?.[0]?.seasons ?? [];
    return {
      actual: seasons.find((x) => x.current)?.year ?? null,
      max: Math.max(0, ...seasons.map((x) => x.year)),
    };
  };
  try {
    const nuevas: string[] = [];
    for (const c of COMPETITIONS) {
      const t = await leer(c.leagueId);
      if (t.actual != null && t.actual > c.season) {
        nuevas.push(`${c.name} (tenemos ${c.season}, el API ya va por ${t.actual})`);
      }
    }
    const euro = await leer(EURO_CLASIFICACION.id);
    if (euro.max > EURO_CLASIFICACION.ultimaConocida) {
      nuevas.push(
        `la Clasificación a la Euro ya tiene la edición ${euro.max}: añadirla como competición (id 960)`,
      );
    }
    if (nuevas.length === 0) return null;
    return (
      `Hay temporada nueva en API-Football: ${nuevas.join("; ")}. ` +
      `Subir \`season\` (y archivar la anterior) en src/lib/sports/competitions.ts.`
    );
  } catch {
    return null;
  }
}

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
    .not("status", "in", "(PST,ABD,CANC)")
    .lt("kickoff_at", limite)
    .order("kickoff_at", { ascending: false })
    .limit(20)
    .returns<{ id: number; kickoff_at: string }[]>();

  // Aplazados, suspendidos y cancelados ya no salen (filtro de arriba), así
  // que basta UNO: el 12-oct el Levante–Sevilla se quedó sin marcador y la
  // jornada de la quiniela sin cerrar, y con el umbral de 3 nadie se enteró.
  if ((huerfanos?.length ?? 0) > 0) {
    problemas.push(
      `${huerfanos!.length} partidos acabaron hace más de ${PARTIDO_SIN_MARCADOR_H}h y ` +
        `siguen sin marcador (ids: ${huerfanos!.map((m) => m.id).join(", ")}). ` +
        `La ingesta no los vio. Se recuperan con: ` +
        `node scripts/backfill-lq-results.mjs --all-past`,
    );
  }

  // 4. ¿Hay tablas o calendarios VACÍOS en la caché? (7-oct: sin cuota, el
  //    cron guardó listas vacías y la web enseñó la clasificación vacía.)
  const { data: filasCache } = await supabase
    .from("sports_cache")
    .select("cache_key, data")
    .not("cache_key", "like", "squad:%")
    .returns<{ cache_key: string; data: unknown }[]>();
  const vacias = (filasCache ?? [])
    .filter((f) => Array.isArray(f.data) && f.data.length === 0)
    .map((f) => f.cache_key);
  if (vacias.length > 0) {
    problemas.push(
      `${vacias.length} entradas de la caché de deportes están vacías ` +
        `(${vacias.slice(0, 8).join(", ")}${vacias.length > 8 ? "…" : ""}). ` +
        `La web enseña esas tablas/calendarios en blanco.`,
    );
  }

  // 5. ¿Cómo va la cuota de API-Football? El 7-oct se descubrió que llevaba
  //    10 días agotándose cada tarde por un robot y nadie se enteró. `/status`
  //    no gasta cuota.
  const cuota = await revisarCuota();
  if (cuota) problemas.push(cuota);

  // 6. Temporadas nuevas: una vez al día (la vuelta de las 07:11 UTC), o
  //    siempre con ?temporadas=1 para probarlo.
  const ahoraUtc = new Date();
  if (
    (ahoraUtc.getUTCHours() === 7 && ahoraUtc.getUTCMinutes() < 30) ||
    new URL(request.url).searchParams.get("temporadas") === "1"
  ) {
    const temporadas = await revisarTemporadas();
    if (temporadas) problemas.push(temporadas);
  }

  // 3. ¿Están programados los crons?
  const { data: jobsRaw } = await supabase.rpc("cron_jobs_activos");
  const jobs = (jobsRaw ?? null) as { jobname: string }[] | null;
  if (jobs) {
    const esperados = [
      "ingesta-marcadores",
      "cache-deportes",
      "fechas-lq",
      "recordatorio-quiniela",
      "resumen-jornada",
      "refresco-post-partido",
      "directo",
      "boletin",
    ];
    const faltan = esperados.filter(
      (e) => !jobs.some((j) => j.jobname === e),
    );
    if (faltan.length > 0) {
      problemas.push(
        `Estos crons ya no están programados o están desactivados: ${faltan.join(", ")}. ` +
          `Se reponen aplicando supabase/migrations/038, 043, 055, 059, 061 y 063.`,
      );
    }
  }

  if (problemas.length === 0) {
    return NextResponse.json({ ok: true, problemas: 0 });
  }
  // ?simular=1 → devuelve los problemas sin mandar el correo.
  if (new URL(request.url).searchParams.get("simular") === "1") {
    return NextResponse.json({ ok: false, simulacion: true, problemas });
  }

  // Hay algo roto: avisar, pero no el mismo aviso cada media hora (058).
  // La firma ignora las cifras, que cambian de una vuelta a otra.
  const firma = problemas
    .map((p) => p.replace(/[\d.,%]+/g, "").slice(0, 60))
    .sort()
    .join("|");
  const { data: ultimo } = await supabase
    .from("vigilante_avisos")
    .select("firma, enviado_at")
    .eq("id", 1)
    .maybeSingle<{ firma: string; enviado_at: string }>();
  if (
    ultimo?.firma === firma &&
    Date.now() - Date.parse(ultimo.enviado_at) < REPETIR_AVISO_H * 3_600_000
  ) {
    return NextResponse.json({ ok: false, problemas, avisado: false, repetido: true });
  }

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
      subject: `⚠️ soyreinaldo: ${problemas.length} problema(s)`,
      html,
    });
    avisado = !error;
  }
  if (avisado) {
    await supabase
      .from("vigilante_avisos")
      .upsert({ id: 1, firma, enviado_at: new Date().toISOString() });
  }

  return NextResponse.json({ ok: false, problemas, avisado });
}
