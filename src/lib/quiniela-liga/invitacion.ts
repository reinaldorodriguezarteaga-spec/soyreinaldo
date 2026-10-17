import "server-only";
import { clienteServicio } from "./jornada-datos";

const PUBLICA = "9f992fa0-5f45-4204-87a7-b4c5feda6ae1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Invitacion = {
  retadorId: string;
  retador: string;
  ligaId: string;
  liga: string;
  jornada: number | null;
};

/** Datos públicos de un reto por enlace: quién reta, en qué liga y jornada. */
export async function cargarInvitacion(usuario: string, liga?: string | null): Promise<Invitacion | null> {
  const db = clienteServicio();
  if (!db) return null;
  const columna = UUID_RE.test(usuario) ? "id" : "username";
  const { data: p } = await db
    .from("profiles")
    .select("id, display_name, username")
    .eq(columna, columna === "username" ? usuario.toLowerCase() : usuario)
    .maybeSingle<{ id: string; display_name: string | null; username: string | null }>();
  if (!p) return null;
  const ligaId = liga && UUID_RE.test(liga) ? liga : PUBLICA;
  const [{ data: l }, { data: jornada }] = await Promise.all([
    db.from("leagues").select("id, name").eq("id", ligaId).maybeSingle<{ id: string; name: string }>(),
    db.rpc("lq_jornada_retable"),
  ]);
  if (!l) return null;
  return {
    retadorId: p.id,
    retador: p.display_name || p.username || "Alguien",
    ligaId: l.id,
    liga: l.name,
    jornada: (jornada as number | null) ?? null,
  };
}
