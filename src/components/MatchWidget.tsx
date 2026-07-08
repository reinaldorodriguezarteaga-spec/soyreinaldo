import { getWidgetData } from "@/lib/sports/widget-data";
import MatchWidgetClient from "./MatchWidgetClient";

export default async function MatchWidget() {
  let initial;
  try {
    initial = await getWidgetData();
  } catch {
    return null;
  }

  // Nada que enseñar solo si no hay ni partidos de hoy/en vivo ni próximos.
  if (initial.fixtures.length === 0 && !(initial.next && initial.next.length))
    return null;
  return <MatchWidgetClient initial={initial} />;
}
