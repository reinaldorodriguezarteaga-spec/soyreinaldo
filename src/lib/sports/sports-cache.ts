import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/**
 * Caché precalculada en Supabase (`sports_cache`) para los datos de
 * API-Football que se piden en CADA render de portada/liga (tabla,
 * calendario, marcador de hoy). Un cron externo (cron-job.org, cada
 * 5-10 min) llama a `/api/cron/refresh-sports-cache` y rellena esta tabla
 * vía `writeCache`; las funciones de `api-football.ts` intentan `readCache`
 * primero y solo caen a la llamada en vivo si no hay nada o está viejo — así
 * el consumo de cuota queda acotado por la frecuencia del cron, no por
 * cuántos visitantes (o un bot) entren a la vez. Ver migración 033.
 */

/**
 * Supabase con tiempo máximo por petición: una lectura de la caché colgada
 * bloqueaba la página entera (y el cron) sin límite. 5 s sobran — responde
 * en 0,1-0,2 s. Si se corta, `readCache` devuelve null y se cae a la API.
 */
const conTiempoMax: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(5_000) });

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: conTiempoMax },
  });
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: conTiempoMax },
  });
}

/**
 * La fila tal cual, guardada 2 min en la caché de datos de Vercel. Antes cada
 * render iba a Supabase y se bajaba el JSON entero: la portada lee los
 * calendarios completos de las 10 competiciones (cientos de KB cada uno), y
 * con un robot recorriendo la web el tráfico de salida de Supabase se fue a
 * 11 GB de 5,5 del plan gratis (aviso de corte, sep-2026). El cron reescribe
 * cada 10 min, así que 2 min de retraso no se notan.
 */
const leerFila = (key: string) =>
  unstable_cache(
    async (): Promise<{ data: unknown; updated_at: string } | null> => {
      try {
        const supabase = anonClient();
        if (!supabase) return null;
        const { data } = await supabase
          .from("sports_cache")
          .select("data, updated_at")
          .eq("cache_key", key)
          .maybeSingle();
        return data ?? null;
      } catch {
        return null;
      }
    },
    ["sports_cache", key],
    { revalidate: 120 },
  )();

/**
 * Lee una entrada de `sports_cache`. Devuelve `null` (nunca lanza) si no
 * existe, si falla la consulta, o si `updated_at` es más vieja que
 * `maxAgeSeconds`, o si está vacía (`[]`: nunca es un dato útil) — en ese caso el llamador debe caer a la llamada en vivo.
 */
export async function readCache<T>(
  key: string,
  maxAgeSeconds: number,
): Promise<T | null> {
  try {
    const data = await leerFila(key);
    if (!data) return null;
    const ageMs = Date.now() - new Date(data.updated_at).getTime();
    if (ageMs > maxAgeSeconds * 1000) return null;
    if (Array.isArray(data.data) && data.data.length === 0) return null;
    return data.data as T;
  } catch {
    return null;
  }
}

/**
 * De `keys`, cuáles tienen una entrada más nueva que `maxAgeSeconds`. Una
 * sola consulta y sin traer `data`: comprobar ~150 plantillas una a una con
 * `readCache` (bajando cada JSON entero) se comía buena parte del
 * presupuesto de tiempo del cron.
 */
export async function freshCacheKeys(
  keys: string[],
  maxAgeSeconds: number,
): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  try {
    const supabase = anonClient();
    if (!supabase) return new Set();
    const since = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();
    const { data } = await supabase
      .from("sports_cache")
      .select("cache_key")
      .in("cache_key", keys)
      .gte("updated_at", since);
    return new Set((data ?? []).map((r) => r.cache_key as string));
  } catch {
    return new Set();
  }
}

/** Escribe (upsert) una entrada de `sports_cache`. Solo la usa el cron —
 * requiere la service-role key, que salta la RLS de solo-lectura. */
export async function writeCache(key: string, data: unknown): Promise<void> {
  // Nunca pisar datos buenos con un vacío: cuando API-Football se queda sin
  // cuota devuelve listas vacías, y el cron las guardaba encima de la tabla y
  // los calendarios — el 7-oct la web enseñó la clasificación vacía durante
  // horas. Sin escribir, `readCache` sigue sirviendo lo último bueno y, si
  // envejece, cae a la API en vivo como siempre.
  if (data == null || (Array.isArray(data) && data.length === 0)) return;
  const supabase = serviceClient();
  if (!supabase) return;
  await supabase
    .from("sports_cache")
    .upsert({ cache_key: key, data, updated_at: new Date().toISOString() });
}

/**
 * `readCache` con fallback: si no hay nada cacheado (o está viejo), llama a
 * `liveFetch` — el mismo camino en vivo de siempre, sin cambios de
 * comportamiento cuando el cron no ha corrido o `sports_cache` está vacío.
 */
export async function cachedOrLive<T>(
  key: string,
  maxAgeSeconds: number,
  liveFetch: () => Promise<T>,
): Promise<T> {
  const cached = await readCache<T>(key, maxAgeSeconds);
  if (cached !== null) return cached;
  return liveFetch();
}
