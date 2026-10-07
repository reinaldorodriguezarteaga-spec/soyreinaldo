import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** Horizonte: lo que se juega en los próximos dos días. */
const HORAS = 48;

/**
 * Aviso en la portada: "Te faltan N pronósticos". Complementa el email
 * diario del cron `recordatorio-quiniela` — lo ve quien ya está dentro de la
 * web. Solo para quien juega (algún pronóstico hecho) y solo si le falta
 * alguno; si no, no pinta nada. Cada partido se cierra a su hora de inicio.
 */
async function contarPendientes(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + HORAS * 3_600_000);
    const [{ count: jugados }, { data: proximos }] = await Promise.all([
      supabase
        .from("lq_predictions")
        .select("match_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("lq_matches")
        .select("id")
        .eq("finished", false)
        .gt("kickoff_at", ahora.toISOString())
        .lte("kickoff_at", hasta.toISOString())
        .returns<{ id: number }[]>(),
    ]);
    if (!jugados || !proximos || proximos.length === 0) return 0;

    const { data: hechos } = await supabase
      .from("lq_predictions")
      .select("match_id")
      .eq("user_id", user.id)
      .in("match_id", proximos.map((m) => m.id))
      .returns<{ match_id: number }[]>();
    return Math.max(0, proximos.length - (hechos?.length ?? 0));
  } catch {
    return 0;
  }
}

export default async function QuinielaPendientes() {
  const faltan = await contarPendientes();
  if (faltan <= 0) return null;

  return (
    <Link
      href="/quiniela-liga/partidos"
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
      <span aria-hidden style={{ fontSize: "1.4rem" }}>⚽</span>
      <span style={{ flex: 1 }}>
        <strong>
          Te {faltan === 1 ? "falta 1 pronóstico" : `faltan ${faltan} pronósticos`}
        </strong>
        <span style={{ display: "block", color: "var(--text-dim)", fontSize: "0.88rem" }}>
          Partidos de la quiniela en los próximos dos días. Cada uno se cierra al empezar.
        </span>
      </span>
      <span className="arr" style={{ color: "var(--accent)" }}>→</span>
    </Link>
  );
}
