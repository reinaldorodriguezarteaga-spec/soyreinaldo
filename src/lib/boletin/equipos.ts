import { isFinal, type Fixture } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import { conTildes } from "@/lib/sports/nombres";
import type { EquipoBoletin } from "./boletin";

/**
 * Un equipo favorito en el boletín: su último resultado de los últimos
 * `dias` días y su próximo partido de los siguientes `dias`. Si no hay ni lo
 * uno ni lo otro (parón), null: no se pinta.
 */
export function equipoBoletin(
  equipo: { id: number; nombre: string; principal: boolean; liga: string | null },
  recientes: Fixture[],
  proximos: Fixture[],
  site: string,
  ahora: number,
  dias = 7,
): EquipoBoletin | null {
  const ventana = dias * 86_400_000;
  const url = (f: Fixture) => {
    const slug = COMPETITIONS.find((c) => c.leagueId === f.league.id)?.slug ?? equipo.liga;
    return slug ? `${site}/liga/${slug}/partido/${f.fixture.id}` : `${site}/`;
  };

  const ult = [...recientes]
    .filter((f) => isFinal(f) && f.goals.home != null && f.goals.away != null)
    .sort((a, b) => Date.parse(b.fixture.date) - Date.parse(a.fixture.date))
    .find((f) => ahora - Date.parse(f.fixture.date) <= ventana);
  const prox = [...proximos]
    .sort((a, b) => Date.parse(a.fixture.date) - Date.parse(b.fixture.date))
    .find((f) => {
      const t = Date.parse(f.fixture.date);
      return t > ahora && t - ahora <= ventana;
    });
  if (!ult && !prox) return null;

  let ultimo: EquipoBoletin["ultimo"] = null;
  if (ult) {
    const local = ult.teams.home.id === equipo.id;
    const mios = (local ? ult.goals.home : ult.goals.away) ?? 0;
    const suyos = (local ? ult.goals.away : ult.goals.home) ?? 0;
    ultimo = {
      local: conTildes(ult.teams.home.name),
      visitante: conTildes(ult.teams.away.name),
      goles: `${ult.goals.home}–${ult.goals.away}`,
      res: mios > suyos ? "V" : mios < suyos ? "D" : "E",
      url: url(ult),
    };
  }
  return {
    nombre: equipo.nombre,
    principal: equipo.principal,
    ultimo,
    proximo: prox
      ? {
          fecha: prox.fixture.date,
          local: conTildes(prox.teams.home.name),
          visitante: conTildes(prox.teams.away.name),
          url: url(prox),
        }
      : null,
  };
}
