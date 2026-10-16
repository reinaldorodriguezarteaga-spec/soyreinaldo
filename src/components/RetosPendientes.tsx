import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * "⚔️ X te ha retado": aviso de duelos pendientes de aceptar (portada y
 * pronósticos). Lleva a la pestaña Duelos de la liga del primer reto.
 */
async function cargarRetos() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: jornada } = await supabase.rpc("lq_jornada_retable");
    if (jornada == null) return null;
    const { data: retos } = await supabase
      .from("lq_duelos")
      .select("league_id, retador")
      .eq("rival", user.id)
      .eq("estado", "pendiente")
      .eq("matchday", jornada as number)
      .returns<{ league_id: string; retador: string }[]>();
    if (!retos || retos.length === 0) return null;

    const { data: perfil } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", retos[0].retador)
      .maybeSingle<{ display_name: string | null }>();
    return { retos, jornada: jornada as number, quien: perfil?.display_name ?? "Alguien" };
  } catch {
    return null;
  }
}

export default async function RetosPendientes() {
  const datos = await cargarRetos();
  if (!datos) return null;
  const { retos, jornada, quien } = datos;
  const texto =
    retos.length === 1 ? `${quien} te ha retado` : `${quien} y ${retos.length - 1} más te han retado`;

  return (
    <Link
      href={`/quiniela-liga/ranking?vista=duelos&liga=${encodeURIComponent(retos[0].league_id)}`}
      className="panel"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        textDecoration: "none",
        color: "inherit",
        borderColor: "var(--accent)",
      }}
    >
      <span aria-hidden style={{ fontSize: "1.4rem" }}>⚔️</span>
      <span style={{ flex: 1 }}>
        <strong>{texto}</strong> en la jornada {jornada}. Acepta antes de que empiece.
      </span>
      <span className="arr" aria-hidden>→</span>
    </Link>
  );
}
