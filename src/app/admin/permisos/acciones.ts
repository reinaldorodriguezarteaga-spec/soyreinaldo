"use server";

import { revalidatePath } from "next/cache";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { accesoActual, PERMISOS, type Permiso } from "@/lib/permisos";

/** Dar o quitar un permiso (solo el admin). La columna `permisos` no la puede
 * tocar el usuario (migración 087): se escribe con la service role. */
export async function cambiarPermiso(
  username: string,
  permiso: Permiso,
  dar: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const yo = await accesoActual();
  if (!yo?.admin) return { ok: false, error: "No autorizado" };
  if (!(permiso in PERMISOS)) return { ok: false, error: "Permiso no válido" };
  const db = clienteServicio();
  if (!db) return { ok: false, error: "Sin conexión" };
  const nombre = username.trim().replace(/^@/, "").toLowerCase();
  const { data: perfil } = await db
    .from("profiles")
    .select("id, permisos")
    .eq("username", nombre)
    .maybeSingle<{ id: string; permisos: string[] | null }>();
  if (!perfil) return { ok: false, error: `No hay ningún usuario «${nombre}»` };
  const actuales = new Set(perfil.permisos ?? []);
  if (dar) actuales.add(permiso);
  else actuales.delete(permiso);
  const { error } = await db.from("profiles").update({ permisos: [...actuales] }).eq("id", perfil.id);
  if (error) return { ok: false, error: "No se pudo guardar" };
  revalidatePath("/admin/permisos");
  return { ok: true };
}
