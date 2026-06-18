import type { FixtureEvents } from "@/lib/sports/widget-data";

function shortName(name: string): string {
  const t = name.trim().split(/\s+/);
  return t.length > 1 ? t[t.length - 1] : name;
}

type Line = { icon: string; minute: number | null; who: string; tag: string };

/**
 * Goles y expulsiones de un partido bajo cada equipo (local izq, visitante der),
 * en formato compacto para las tarjetas de marcador. El autogol cuenta para el
 * equipo rival.
 */
export default function MatchCardEvents({
  ev,
  homeId,
  awayId,
}: {
  ev: FixtureEvents | null;
  homeId: number;
  awayId: number;
}) {
  if (!ev || (ev.goals.length === 0 && ev.reds.length === 0)) return null;

  const benef = (teamId: number, detail: string) =>
    detail === "Own Goal" ? (teamId === homeId ? awayId : homeId) : teamId;

  const linesFor = (teamId: number): Line[] => {
    const goals: Line[] = ev.goals
      .filter((g) => benef(g.teamId, g.detail) === teamId)
      .map((g) => ({
        icon: "⚽",
        minute: g.minute,
        who: shortName(g.player),
        tag:
          g.detail === "Penalty" ? " (p)" : g.detail === "Own Goal" ? " (pp)" : "",
      }));
    const reds: Line[] = ev.reds
      .filter((c) => c.teamId === teamId)
      .map((c) => ({ icon: "🟥", minute: c.minute, who: shortName(c.player), tag: "" }));
    return [...goals, ...reds].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  };

  const home = linesFor(homeId);
  const away = linesFor(awayId);
  if (home.length === 0 && away.length === 0) return null;

  return (
    <div className="match__ev">
      <div>
        {home.map((l, i) => (
          <span key={i}>
            {l.icon} {l.minute != null ? `${l.minute}'` : ""} {l.who}
            {l.tag}
          </span>
        ))}
      </div>
      <div className="right">
        {away.map((l, i) => (
          <span key={i}>
            {l.who}
            {l.tag} {l.minute != null ? `${l.minute}'` : ""} {l.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
