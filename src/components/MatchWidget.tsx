import { getWidgetData } from "@/lib/sports/widget-data";
import MatchWidgetClient from "./MatchWidgetClient";

export default async function MatchWidget() {
  let initial;
  try {
    initial = await getWidgetData();
  } catch {
    return null;
  }

  if (initial.fixtures.length === 0) return null;
  return <MatchWidgetClient initial={initial} />;
}
