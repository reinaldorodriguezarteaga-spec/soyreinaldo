import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

async function crearCliente() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies; the middleware refreshes them.
          }
        },
      },
    },
  );
}

/**
 * `auth.getUser()` UNA vez por petición y sesión (17-oct). Cada componente
 * de servidor creaba su cliente y preguntaba al servidor de Auth por su
 * cuenta: en la portada con sesión eran 6-8 viajes por visita. La clave es
 * el valor de las cookies de sesión: si cambian a mitad de la petición (al
 * iniciar o cerrar sesión en una acción), se vuelve a preguntar.
 */
const usuarioDeLaSesion = cache(async (_clave: string) => {
  const cliente = await crearCliente();
  // Verificación LOCAL del JWT (claves ES256 del proyecto): sin viaje a Auth.
  // Si no se puede (sin sesión, token raro), el getUser de siempre.
  try {
    const { data } = await cliente.auth.getClaims();
    const c = data?.claims;
    if (c?.sub) {
      return {
        data: {
          user: {
            id: c.sub,
            email: c.email,
            phone: c.phone,
            role: c.role,
            aud: Array.isArray(c.aud) ? c.aud[0] : c.aud,
            app_metadata: c.app_metadata ?? {},
            user_metadata: c.user_metadata ?? {},
            is_anonymous: c.is_anonymous,
            created_at: "",
          } as User,
        },
        error: null,
      } as Awaited<ReturnType<typeof cliente.auth.getUser>>;
    }
  } catch {
    // Cae al camino de siempre.
  }
  return cliente.auth.getUser();
});

/**
 * El usuario COMPLETO desde Auth (identidades vinculadas, fechas...). Solo
 * para quien lo necesite (/perfil); el resto, `getUser()` normal.
 */
export const getUsuarioCompleto = cache(async () => (await crearCliente()).auth.getUser());

export async function createClient() {
  const cliente = await crearCliente();
  const original = cliente.auth.getUser.bind(cliente.auth);
  cliente.auth.getUser = (async (jwt?: string) => {
    if (jwt) return original(jwt);
    const clave = (await cookies())
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .map((c) => `${c.name}=${c.value}`)
      .join(";");
    return usuarioDeLaSesion(clave);
  }) as typeof cliente.auth.getUser;
  return cliente;
}
