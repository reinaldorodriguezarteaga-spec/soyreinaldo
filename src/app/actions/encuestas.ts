"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoEncuesta = { ok: true } | { ok: false; mensaje: string };

export async function votarEncuesta(encuestaId: string, opcion: string, ruta: string): Promise<ResultadoEncuesta> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("votar_encuesta", { p_encuesta: encuestaId, p_opcion: opcion });
  if (error) {
    return {
      ok: false,
      mensaje: error.message.includes("sin_sesion")
        ? "Inicia sesión para votar."
        : error.message.includes("cerrada")
          ? "La encuesta ya está cerrada."
          : "No se pudo votar. Prueba otra vez.",
    };
  }
  revalidatePath(ruta);
  return { ok: true };
}

/** Solo admin (lo impone la RLS de `encuestas`). Opciones: 2 a 4. */
export async function crearEncuesta(
  fixtureId: number,
  pregunta: string,
  opciones: string[],
  ruta: string,
): Promise<ResultadoEncuesta> {
  const limpias = opciones.map((o) => o.trim()).filter(Boolean).slice(0, 4);
  const p = pregunta.trim();
  if (p.length < 3 || limpias.length < 2) return { ok: false, mensaje: "Pon la pregunta y al menos 2 opciones." };
  const supabase = await createClient();
  const { error } = await supabase.from("encuestas").insert({
    fixture_id: fixtureId,
    tipo: "libre",
    pregunta: p.slice(0, 140),
    opciones: limpias.map((texto, i) => ({ id: String.fromCharCode(97 + i), texto: texto.slice(0, 60) })),
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  if (error) return { ok: false, mensaje: "No se pudo crear (¿eres admin?)." };
  revalidatePath(ruta);
  return { ok: true };
}

export async function cerrarEncuesta(id: string, ruta: string): Promise<ResultadoEncuesta> {
  const supabase = await createClient();
  const { error } = await supabase.from("encuestas").update({ cerrada: true }).eq("id", id);
  if (error) return { ok: false, mensaje: "No se pudo cerrar." };
  revalidatePath(ruta);
  return { ok: true };
}
