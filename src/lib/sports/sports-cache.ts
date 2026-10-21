import { unstable_cache } from "next/cache";
import { equiposEnEspanol } from "./nombres";
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
const leerFila = (key: string, signal?: AbortSignal) =>
  unstable_cache(
    async (): Promise<{ data: unknown; updated_at: string } | null> => {
      try {
        const supabase = anonClient();
        if (!supabase) return null;
        const { data } = await supabase
          .from("sports_cache")
          .select("data, updated_at")
          .eq("cache_key", key)
          .abortSignal(signal ?? AbortSignal.timeout(5_000))
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
/**
 * Memoria por instancia (17-oct, incidente): la base de datos se saturó a
 * las 22:32 con 3,9 M lecturas de `sports_cache`. `unstable_cache` no
 * guarda las filas grandes (los calendarios de temporada superan el límite
 * de la Data Cache de Vercel), así que cada llamada iba a Postgres a por
 * cientos de KB. Aquí: 30 s de memoria por clave y, si llegan varias
 * peticiones a la vez, una sola lectura. La caché la refresca el cron cada
 * 10 min: 30 s más de antigüedad no cambian nada.
 */
const MEMO_MS = 30_000;
const MEMO_MAX = 200;
type FilaCache = { data: unknown; updated_at: string } | null;
const memoFilas = new Map<string, { t: number; fila: Promise<FilaCache> }>();

/** Solo para pruebas: vacía la memoria por instancia. */
export function vaciarMemoCache(): void {
  memoFilas.clear();
}

function leerFilaMemo(key: string): Promise<FilaCache> {
  const ahora = Date.now();
  const m = memoFilas.get(key);
  if (m && ahora - m.t < MEMO_MS) return m.fila;
  if (memoFilas.size >= MEMO_MAX) {
    for (const [k, v] of memoFilas) if (ahora - v.t >= MEMO_MS) memoFilas.delete(k);
    if (memoFilas.size >= MEMO_MAX) memoFilas.clear();
  }
  const fila = leerFila(key).catch(() => null);
  memoFilas.set(key, { t: ahora, fila });
  // Ni un fallo ni una fila vacía se recuerdan: la siguiente petición
  // vuelve a mirar (una vacía nunca es un dato útil).
  void fila.then((f) => {
    const inutil = f == null || (Array.isArray(f.data) && f.data.length === 0);
    if (inutil && memoFilas.get(key)?.fila === fila) memoFilas.delete(key);
  });
  return fila;
}

export async function readCache<T>(
  key: string,
  maxAgeSeconds: number,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    // Con presupuesto (el cron del directo, pocas lecturas): directa y
    // cortable. Sin él (las páginas): memoria compartida de 30 s.
    const data = signal ? await leerFila(key, signal) : await leerFilaMemo(key);
    if (!data) return null;
    const ageMs = Date.now() - new Date(data.updated_at).getTime();
    if (ageMs > maxAgeSeconds * 1000) return null;
    if (Array.isArray(data.data) && data.data.length === 0) return null;
    // Lo guardado antes del 13-oct puede traer nombres en inglés o sin tilde.
    return equiposEnEspanol(data.data) as T;
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
  // Con firma (migración 081): si el JSON no cambió, solo se renueva la
  // fecha y Postgres no vuelve a escribir el dato (aviso de Disk IO, 21-oct).
  await supabase.rpc("guardar_cache", { p_key: key, p_data: data });
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
  return conUltimoBueno(key, await liveFetch());
}

/**
 * Si lo que llega en vivo está vacío (API sin cuota, caída, límite por
 * minuto), se sirve lo último bueno de `sports_cache` AUNQUE sea viejo: una
 * tabla de hace unas horas es mejor que una página vacía (7-oct: sin cuota,
 * la clasificación salió vacía hasta medianoche).
 */
export async function conUltimoBueno<T>(key: string, vivo: T): Promise<T> {
  const vacio = vivo == null || (Array.isArray(vivo) && vivo.length === 0);
  if (!vacio) return vivo;
  const viejo = await readCache<T>(key, Number.POSITIVE_INFINITY);
  return viejo ?? vivo;
}
