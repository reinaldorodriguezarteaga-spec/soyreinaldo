import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Totales de carrera de Messi y Cristiano: base de una fuente con el mismo
 * criterio para los dos (`goat_base`) + cada partido que juegan desde
 * entonces (`goat_partidos`, lo apunta el cron `goats`). Lo comparten el
 * cuadro de la web y la imagen para compartir (18-oct).
 */
type Base = {
  jugador: string;
  api_id: number;
  partidos: number;
  goles: number;
  asistencias: number;
  fuente: string;
  pen_marcados: number;
  pen_fallados: number;
};
type Partido = {
  jugador: string;
  minutos: number;
  goles: number;
  asistencias: number;
  pen_marcados: number;
  pen_fallados: number;
};

export type TotalGoat = {
  apiId: number;
  fuente: string;
  partidos: number;
  goles: number;
  asistencias: number;
  ga: number;
  /** Penaltis marcados y lanzados (marcados + fallados). */
  penMarcados: number;
  penLanzados: number;
};

export async function totalesGoats(
  supabase: SupabaseClient,
): Promise<{ messi: TotalGoat; ronaldo: TotalGoat } | null> {
  const [{ data: bases }, { data: partidos }] = await Promise.all([
    supabase.from("goat_base").select("jugador, api_id, partidos, goles, asistencias, fuente, pen_marcados, pen_fallados").returns<Base[]>(),
    supabase.from("goat_partidos").select("jugador, minutos, goles, asistencias, pen_marcados, pen_fallados").returns<Partido[]>(),
  ]);
  const total = (jugador: string): TotalGoat | null => {
    const b = (bases ?? []).find((x) => x.jugador === jugador);
    if (!b) return null;
    const jugados = (partidos ?? []).filter((p) => p.jugador === jugador && p.minutos > 0);
    const goles = b.goles + jugados.reduce((n, p) => n + p.goles, 0);
    const asistencias = b.asistencias + jugados.reduce((n, p) => n + p.asistencias, 0);
    const penMarcados = b.pen_marcados + jugados.reduce((n, p) => n + p.pen_marcados, 0);
    const penFallados = b.pen_fallados + jugados.reduce((n, p) => n + p.pen_fallados, 0);
    return {
      apiId: b.api_id,
      fuente: b.fuente,
      partidos: b.partidos + jugados.length,
      goles,
      asistencias,
      ga: goles + asistencias,
      penMarcados,
      penLanzados: penMarcados + penFallados,
    };
  };
  const messi = total("messi");
  const ronaldo = total("ronaldo");
  return messi && ronaldo ? { messi, ronaldo } : null;
}

const fmt = (n: number) => n.toLocaleString("es-ES");

/** Filas de la comparativa: lo que se enseña y con qué se decide quién va
 * delante (en penaltis, el acierto, no cuántos tiró). */
export const FILAS_GOATS: {
  clave: string;
  label: string;
  nota?: string;
  valor: (t: TotalGoat) => string;
  peso: (t: TotalGoat) => number;
}[] = [
  { clave: "partidos", label: "Partidos jugados", valor: (t) => fmt(t.partidos), peso: (t) => t.partidos },
  { clave: "goles", label: "Goles", valor: (t) => fmt(t.goles), peso: (t) => t.goles },
  { clave: "asistencias", label: "Asistencias", valor: (t) => fmt(t.asistencias), peso: (t) => t.asistencias },
  { clave: "ga", label: "G/A", nota: "goles + asistencias", valor: (t) => fmt(t.ga), peso: (t) => t.ga },
  {
    clave: "penaltis",
    label: "Penaltis",
    nota: "marcados / lanzados",
    valor: (t) => `${t.penMarcados}/${t.penLanzados}`,
    peso: (t) => (t.penLanzados > 0 ? t.penMarcados / t.penLanzados : 0),
  },
];
