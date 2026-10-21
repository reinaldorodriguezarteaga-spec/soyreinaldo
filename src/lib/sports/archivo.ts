import { createClient } from "@supabase/supabase-js";

/**
 * Archivo permanente de respuestas de API-Football (`apif_archivo`, migración
 * 054). Ver la política de qué se guarda en `api-football.ts` (`get()`).
 * Solo servidor y service role: la tabla tiene RLS sin políticas.
 */

/** `actualizado`: cuándo se guardó (ms), para servir sin API lo reciente. */
export type FilaArchivo = { respuesta: unknown; final: boolean; actualizado?: number };

/** Hay algo que guardar: una lista con elementos o un objeto (p. ej.
 * `/teams/statistics` devuelve un objeto, no una lista). */
export function respuestaUtil(r: unknown): boolean {
  if (Array.isArray(r)) return r.length > 0;
  return r !== null && typeof r === "object" && Object.keys(r).length > 0;
}

const conTiempoMax: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(5_000) });

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: conTiempoMax },
  });
}

/** `null` si no hay nada guardado o si la lectura falla (nunca lanza). */
export async function leerArchivo(url: string): Promise<FilaArchivo | null> {
  try {
    const db = cliente();
    if (!db) return null;
    const { data } = await db
      .from("apif_archivo")
      .select("respuesta, final, actualizado")
      .eq("url", url)
      .maybeSingle();
    if (!data || !respuestaUtil(data.respuesta)) return null;
    return {
      respuesta: data.respuesta,
      final: data.final,
      actualizado: Date.parse(data.actualizado),
    };
  } catch {
    return null;
  }
}

/** Guarda la respuesta (nunca vacía). Best-effort: si falla, no pasa nada. */
export async function guardarArchivo(
  url: string,
  respuesta: unknown,
  final: boolean,
): Promise<void> {
  if (!respuestaUtil(respuesta)) return;
  try {
    const db = cliente();
    if (!db) return;
    // Con firma (migración 081): una respuesta idéntica a la guardada solo
    // renueva la fecha, sin reescribir el JSON (aviso de Disk IO, 21-oct).
    await db.rpc("guardar_archivo", { p_url: url, p_respuesta: respuesta, p_final: final });
  } catch {
    // best-effort
  }
}
