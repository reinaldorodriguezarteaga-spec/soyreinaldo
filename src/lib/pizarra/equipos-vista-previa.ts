import "server-only";
import { cache } from "react";
import { equiposPizarra } from "./equipos";
import { getFixtureById } from "@/lib/sports/api-football";
import { equiposEnEspanol } from "@/lib/sports/nombres";
import { COMPETITIONS } from "@/lib/sports/competitions";

/** Mismos equipos admitidos por la página; nunca se pide una plantilla por un id libre. */
export const equiposVistaPrevia = cache(async (local?: string, visitante?: string, partido?: string) => {
  const idPartido = Number(partido);
  if (Number.isInteger(idPartido) && idPartido > 0) {
    const fixture = await getFixtureById(idPartido).catch(() => null);
    if (fixture && COMPETITIONS.some((c) => c.leagueId === fixture.league.id)) {
      const { teams } = equiposEnEspanol(fixture);
      return { local: teams.home, visitante: teams.away };
    }
  }
  const equipos = (await equiposPizarra()).flatMap((g) => g.equipos);
  const l = equipos.find((e) => e.id === Number(local));
  const v = equipos.find((e) => e.id === Number(visitante));
  return l && v ? { local: l, visitante: v } : null;
});
