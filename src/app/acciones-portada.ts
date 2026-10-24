"use server";

import { unstable_cache } from "next/cache";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { fixtureLigero, getPartidosDelDia, type DiaPortada } from "@/lib/sports/widget-data";

/** Días hacia atrás y hacia delante que se pueden consultar desde la portada. */
const MARGEN_DIAS = 60;

const cargar = unstable_cache(
  async (dateKey: string): Promise<DiaPortada> => {
    const dia = await getPartidosDelDia(COMPETITIONS, dateKey);
    return { ...dia, grupos: dia.grupos.map((g) => ({ ...g, fixtures: g.fixtures.map(fixtureLigero) })) };
  },
  ["portada-dia-v1"],
  { revalidate: 300 },
);

/**
 * Partidos de un día para la tira de fechas de la portada (24-oct). Sale del
 * calendario guardado por el cron: no gasta cuota. Solo fechas razonables
 * (±60 días), para que nadie llene la caché de claves basura.
 */
export async function partidosDelDia(dateKey: string): Promise<DiaPortada | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const t = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(t) || Math.abs(t - Date.now()) > MARGEN_DIAS * 86_400_000) return null;
  return cargar(dateKey).catch(() => null);
}
