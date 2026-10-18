import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Totales de carrera de Messi y Cristiano: base de una fuente con el mismo
 * criterio para los dos (`goat_base`) + cada partido que juegan desde
 * entonces (`goat_partidos`, lo apunta el cron `goats`). Lo comparten el
 * cuadro de la web y la imagen para compartir (18-oct).
 */
type Base = { jugador: string; api_id: number; partidos: number; goles: number; asistencias: number; fuente: string };
type Partido = { jugador: string; minutos: number; goles: number; asistencias: number };

export type TotalGoat = {
  apiId: number;
  fuente: string;
  partidos: number;
  goles: number;
  asistencias: number;
  ga: number;
};

export async function totalesGoats(
  supabase: SupabaseClient,
): Promise<{ messi: TotalGoat; ronaldo: TotalGoat } | null> {
  const [{ data: bases }, { data: partidos }] = await Promise.all([
    supabase.from("goat_base").select("jugador, api_id, partidos, goles, asistencias, fuente").returns<Base[]>(),
    supabase.from("goat_partidos").select("jugador, minutos, goles, asistencias").returns<Partido[]>(),
  ]);
  const total = (jugador: string): TotalGoat | null => {
    const b = (bases ?? []).find((x) => x.jugador === jugador);
    if (!b) return null;
    const jugados = (partidos ?? []).filter((p) => p.jugador === jugador && p.minutos > 0);
    const goles = b.goles + jugados.reduce((n, p) => n + p.goles, 0);
    const asistencias = b.asistencias + jugados.reduce((n, p) => n + p.asistencias, 0);
    return {
      apiId: b.api_id,
      fuente: b.fuente,
      partidos: b.partidos + jugados.length,
      goles,
      asistencias,
      ga: goles + asistencias,
    };
  };
  const messi = total("messi");
  const ronaldo = total("ronaldo");
  return messi && ronaldo ? { messi, ronaldo } : null;
}

export const FILAS_GOATS = [
  { clave: "partidos", label: "Partidos jugados" },
  { clave: "goles", label: "Goles" },
  { clave: "asistencias", label: "Asistencias" },
  { clave: "ga", label: "G/A", nota: "goles + asistencias" },
] as const;
