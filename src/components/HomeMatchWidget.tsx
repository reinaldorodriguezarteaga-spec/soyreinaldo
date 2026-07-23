import { getHomeWidgetData } from "@/lib/sports/widget-data";
import { COMPETITIONS } from "@/lib/sports/competitions";
import HomeMatchWidgetClient from "./HomeMatchWidgetClient";

/**
 * Widget de marcadores de la portada (LaLiga + Champions League). Paralelo a
 * `MatchWidget` (que sigue exclusivo del Mundial/clubs vía `getWidgetData()`
 * — no tocar), para la portada rediseñada estilo FotMob/SofaScore (PR6).
 */
export default async function HomeMatchWidget() {
  let initial;
  try {
    initial = await getHomeWidgetData(COMPETITIONS);
  } catch {
    return null;
  }

  // Nada que enseñar solo si no hay ni partidos en vivo/hoy ni resultados recientes.
  if (
    initial.live.length === 0 &&
    initial.today.length === 0 &&
    initial.recentResults.length === 0
  ) {
    return null;
  }
  return <HomeMatchWidgetClient initial={initial} />;
}
