import type { FixtureEvents } from "@/lib/sports/widget-data";
import { nombreCorto } from "@/lib/sports/nombres";

/** Una línea por jugador: "Barcola 24', 37', 66'". */
type Linea = { icon: string; who: string; minutos: string; primero: number };

/**
 * Goles y expulsiones de un partido bajo cada equipo (local izq, visitante
 * der), en formato compacto para las tarjetas de marcador. Como en la ficha
 * del partido (15-oct, pedido del dueño): un jugador por línea con todos sus
 * minutos, "(pen)" / "(p.p.)" detrás del minuto y el nombre corto. El
 * autogol va bajo el equipo beneficiado, que es el que ya trae el API.
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

  const agrupar = (
    icon: string,
    eventos: { player: string; minute: number | null; tag: string }[],
  ): Linea[] => {
    const por = new Map<string, Linea>();
    for (const e of eventos) {
      const who = nombreCorto(e.player);
      const min = `${e.minute ?? "?"}'${e.tag ? ` ${e.tag}` : ""}`;
      const l = por.get(who);
      if (l) l.minutos += `, ${min}`;
      else por.set(who, { icon, who, minutos: min, primero: e.minute ?? 0 });
    }
    return [...por.values()];
  };

  const linesFor = (teamId: number): Linea[] => {
    const goles = agrupar(
      "⚽",
      ev.goals
        .filter((g) => g.teamId === teamId)
        .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
        .map((g) => ({
          player: g.player,
          minute: g.minute,
          tag: g.detail === "Penalty" ? "(pen)" : g.detail === "Own Goal" ? "(p.p.)" : "",
        })),
    );
    const rojas = agrupar(
      "🟥",
      ev.reds
        .filter((c) => c.teamId === teamId)
        .map((c) => ({ player: c.player, minute: c.minute, tag: "" })),
    );
    // Goleadores por su primer gol; las expulsiones, al final.
    return [...goles.sort((a, b) => a.primero - b.primero), ...rojas];
  };

  const home = linesFor(homeId);
  const away = linesFor(awayId);
  if (home.length === 0 && away.length === 0) return null;

  return (
    <div className="match__ev">
      <div>
        {home.map((l, i) => (
          <span key={i}>
            {l.icon} {l.who} <span style={{ color: "var(--text-dim)" }}>{l.minutos}</span>
          </span>
        ))}
      </div>
      <div className="right">
        {away.map((l, i) => (
          <span key={i}>
            {l.who} <span style={{ color: "var(--text-dim)" }}>{l.minutos}</span> {l.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
