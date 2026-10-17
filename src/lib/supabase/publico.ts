import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anónimo SIN cookies, para leer datos públicos dentro de
 * `unstable_cache` (allí no se puede tocar `cookies()`). Solo ve lo que la
 * RLS deja ver a `anon`.
 */
export function clientePublico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}
