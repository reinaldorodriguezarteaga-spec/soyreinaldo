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

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Lee una entrada de `sports_cache`. Devuelve `null` (nunca lanza) si no
 * existe, si falla la consulta, o si `updated_at` es más vieja que
 * `maxAgeSeconds` — en ese caso el llamador debe caer a la llamada en vivo.
 */
export async function readCache<T>(
  key: string,
  maxAgeSeconds: number,
): Promise<T | null> {
  try {
    const supabase = anonClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("sports_cache")
      .select("data, updated_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    const ageMs = Date.now() - new Date(data.updated_at).getTime();
    if (ageMs > maxAgeSeconds * 1000) return null;
    return data.data as T;
  } catch {
    return null;
  }
}

/** Escribe (upsert) una entrada de `sports_cache`. Solo la usa el cron —
 * requiere la service-role key, que salta la RLS de solo-lectura. */
export async function writeCache(key: string, data: unknown): Promise<void> {
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
