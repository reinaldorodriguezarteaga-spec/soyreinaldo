"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { exigirSeccion } from "@/lib/permisos";

const ESTADOS = ["nuevo", "revisado", "arreglado", "descartado"] as const;
export type EstadoReporte = (typeof ESTADOS)[number];

/** Cambia el estado de un reporte (solo administradores). */
export async function marcarReporte(id: number, estado: EstadoReporte) {
  await exigirSeccion("admin");
  if (!ESTADOS.includes(estado) || !Number.isInteger(id)) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  await createClient(url, key, { auth: { persistSession: false } }).from("reportes").update({ estado }).eq("id", id);
  revalidatePath("/admin/reportes");
}
