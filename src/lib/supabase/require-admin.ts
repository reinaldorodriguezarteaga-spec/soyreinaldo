import { createClient } from "@/lib/supabase/server";

/**
 * Guard para rutas API de admin (las páginas ya lo hacen en el layout).
 * Devuelve el user si tiene is_admin; null en caso contrario.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user : null;
}

/** Guard de API para una sección con permiso propio (migración 087): admin o
 * quien tenga ese permiso. */
export async function requirePermiso(permiso: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc("tiene_permiso", { p: permiso });
  return data === true ? user : null;
}
