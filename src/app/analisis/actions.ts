"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Contadores de un análisis. Son RPC SECURITY DEFINER porque la RLS de
 * `articles` solo deja escribir al admin; el filtro anti-rastreadores vive
 * dentro del SQL (ver migración 049), que es donde se ve el User-Agent real.
 *
 * Ninguna de las dos devuelve nada ni rompe la página si falla: un contador
 * es un extra, nunca puede tumbar la lectura de un artículo.
 */
export async function marcarVista(slug: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("articles_marcar_vista", { p_slug: slug });
  } catch {
    // Contar es opcional.
  }
}

export async function marcarCompartido(slug: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("articles_marcar_compartido", { p_slug: slug });
  } catch {
    // Contar es opcional.
  }
}
