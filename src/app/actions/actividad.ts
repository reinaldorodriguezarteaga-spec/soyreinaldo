"use server";

import { createClient } from "@/lib/supabase/server";
import { isAppRequest } from "@/lib/is-app";

/**
 * Apunta que el usuario ha estado hoy, en la app o en la web (migración 074,
 * panel /admin/metricas). Idempotente: la clave primaria (usuario, día,
 * canal) ignora repeticiones.
 */
export async function registrarActividad(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("actividad_diaria")
      .upsert(
        { user_id: user.id, en_app: await isAppRequest() },
        { onConflict: "user_id,dia,en_app", ignoreDuplicates: true },
      );
  } catch {
    // Es una métrica: nunca molesta al usuario.
  }
}
