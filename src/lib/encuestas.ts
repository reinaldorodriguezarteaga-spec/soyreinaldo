import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";

/** Encuestas de la ficha del partido (migración 073). */

export type Opcion = { id: string; texto: string };
export type Encuesta = {
  id: string;
  tipo: "mvp" | "libre";
  pregunta: string;
  opciones: Opcion[];
  cerrada: boolean;
  votos: Record<string, number>;
  total: number;
  miVoto: string | null;
};

export async function cargarEncuestas(fixtureId: number): Promise<{
  encuestas: Encuesta[];
  conSesion: boolean;
  esAdmin: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: filas }, { data: recuento }, { data: mios }, { data: perfil }] = await Promise.all([
    supabase
      .from("encuestas")
      .select("id, tipo, pregunta, opciones, cerrada")
      .eq("fixture_id", fixtureId)
      .order("created_at", { ascending: false })
      .returns<{ id: string; tipo: "mvp" | "libre"; pregunta: string; opciones: Opcion[]; cerrada: boolean }[]>(),
    supabase.rpc("resultados_encuestas", { p_fixture: fixtureId }),
    user
      ? supabase.from("encuesta_votos").select("encuesta_id, opcion").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { encuesta_id: string; opcion: string }[] }),
    user
      ? supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle<{ is_admin: boolean | null }>()
      : Promise.resolve({ data: null }),
  ]);
  const cuenta = (recuento ?? []) as { encuesta_id: string; opcion: string; votos: number }[];
  const voto = new Map(((mios ?? []) as { encuesta_id: string; opcion: string }[]).map((v) => [v.encuesta_id, v.opcion]));
  const encuestas = (filas ?? []).map((e) => {
    const votos: Record<string, number> = {};
    for (const c of cuenta.filter((c) => c.encuesta_id === e.id)) votos[c.opcion] = c.votos;
    return {
      ...e,
      votos,
      total: Object.values(votos).reduce((a, b) => a + b, 0),
      miVoto: voto.get(e.id) ?? null,
    };
  });
  return { encuestas, conSesion: !!user, esAdmin: !!perfil?.is_admin };
}

/**
 * La encuesta "¿Quién fue el mejor del partido?" de un partido terminado,
 * con los mejor valorados. Una por partido (índice único): si ya existe, no
 * hace nada. Con la service role porque la crea la ficha, no un admin.
 */
export async function asegurarMvp(fixtureId: number, candidatos: Opcion[]): Promise<void> {
  if (candidatos.length < 2) return;
  const db = clienteServicio();
  if (!db) return;
  const { data: ya } = await db
    .from("encuestas")
    .select("id")
    .eq("fixture_id", fixtureId)
    .eq("tipo", "mvp")
    .maybeSingle();
  if (ya) return;
  await db.from("encuestas").insert({
    fixture_id: fixtureId,
    tipo: "mvp",
    pregunta: "¿Quién fue el mejor del partido?",
    opciones: candidatos,
  });
}
