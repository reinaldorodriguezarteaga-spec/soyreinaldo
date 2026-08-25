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
