import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Permisos por sección del panel (migración 087, 22-oct, pedido del dueño):
 * alguien puede tener solo «analisis» o solo «imagenes» sin ser admin de
 * todo. El admin (is_admin) lo tiene todo; el resto de secciones son solo suyas.
 */
import { PERMISOS, type Permiso, type Seccion } from "./permisos-lista";

export { PERMISOS, type Permiso, type Seccion };

export type Acceso = { userId: string; admin: boolean; permisos: Permiso[] };

export async function accesoActual(): Promise<Acceso | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin, permisos")
    .eq("id", user.id)
    .maybeSingle<{ is_admin: boolean; permisos: string[] | null }>();
  return {
    userId: user.id,
    admin: !!data?.is_admin,
    permisos: (data?.permisos ?? []).filter((p): p is Permiso => p in PERMISOS),
  };
}

export const puede = (a: Acceso | null, s: Seccion) => !!a && (a.admin || (s !== "admin" && a.permisos.includes(s)));

/** Para las páginas del panel: fuera si no tiene esa sección. */
export async function exigirSeccion(s: Seccion): Promise<Acceso> {
  const a = await accesoActual();
  if (!a) redirect("/login?redirect=/admin");
  if (!puede(a, s)) redirect("/");
  return a;
}
