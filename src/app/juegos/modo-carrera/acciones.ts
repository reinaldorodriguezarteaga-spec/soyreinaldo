"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { resumen } from "@/lib/juegos/carrera/motor";
import { reproducir, type Accion, type Inicio } from "@/lib/juegos/carrera/replay";

/** Carreras que cuentan al día por persona (rejugar cuesta poco, pero no infinito). */
const MAX_DIA = 40;

export type FilaTop = {
  user_id: string;
  usuario: string;
  jugador: string;
  nacion: string;
  posicion: string;
  legado: number;
  titulo: string;
  temporadas: number;
  partidos: number;
  goles: number;
  titulos: number;
  balones: number;
  media_max: number;
  clubes: number[];
  mundiales: number;
  modo: "rapida" | "extendida";
};

/**
 * Guarda una carrera terminada en el ranking (migración 094). El servidor
 * la rejuega con sus decisiones y calcula el legado: lo que diga el
 * navegador no cuenta.
 */
export async function guardarCarrera(
  inicio: Inicio,
  acciones: Accion[],
): Promise<
  | { ok: true; legado: number; puesto: number | null; top: FilaTop[]; modo: "rapida" | "extendida"; mundiales: number; puestoMundiales: number | null; topMundiales: FilaTop[]; balones: number; puestoBalones: number | null; topBalones: FilaTop[] }
   | { ok: false; error: "sesion" | "invalida" | "limite" | "error" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sesion" };

  const e = reproducir(inicio, acciones);
  if (!e) return { ok: false, error: "invalida" };
  const r = resumen(e);
  const balones = r.premios.find((p) => p[0] === "Balón de Oro")?.[1] ?? 0;
  const mundiales = r.trofeos.filter(([t]) => /^Mundial \d/.test(t)).reduce((s, t) => s + t[1], 0);

  const db = clienteServicio();
  if (!db) return { ok: false, error: "error" };
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db.from("carrera_records").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", desde);
  if ((count ?? 0) >= MAX_DIA) return { ok: false, error: "limite" };

  const { error } = await db.from("carrera_records").insert({
    user_id: user.id,
    jugador: e.nombre,
    nacion: e.nacion,
    posicion: e.posicion,
    legado: r.legado,
    titulo: r.titulo,
    temporadas: r.temporadas,
    partidos: r.partidos,
    goles: r.goles,
    titulos: r.trofeos.reduce((s, t) => s + t[1], 0),
    balones,
    media_max: r.mediaMax,
    clubes: r.clubes,
    modo: e.extendido ? "extendida" : "rapida",
    mundiales,
  });
  if (error) return { ok: false, error: "error" };

  const [{ data }, { data: dataMundiales }, { data: dataBalones }] = await Promise.all([
    supabase.rpc("carrera_top", { p_limite: 10, p_modo: e.extendido ? "extendida" : "rapida" }),
    supabase.rpc("carrera_top_mundiales", { p_limite: 10 }),
    supabase.rpc("carrera_top_balones", { p_limite: 10 }),
  ]);
  const top = (data ?? []) as FilaTop[];
  const topMundiales = (dataMundiales ?? []) as FilaTop[];
  const topBalones = (dataBalones ?? []) as FilaTop[];
  const i = top.findIndex((f) => f.user_id === user.id && f.legado === r.legado);
  const j = mundiales > 0 ? topMundiales.findIndex((f) => f.user_id === user.id && f.mundiales === mundiales && f.legado === r.legado) : -1;
  const k = balones > 0 ? topBalones.findIndex((f) => f.user_id === user.id && f.balones === balones && f.legado === r.legado) : -1;
  revalidatePath("/juegos/modo-carrera");
  return {
    ok: true,
    legado: r.legado,
    puesto: i >= 0 ? i + 1 : null,
    top,
    modo: e.extendido ? "extendida" : "rapida",
    mundiales,
    puestoMundiales: j >= 0 ? j + 1 : null,
    topMundiales,
    balones,
    puestoBalones: k >= 0 ? k + 1 : null,
    topBalones,
  };
}
