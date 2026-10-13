import { describe, expect, it } from "vitest";
import { equiposEnEspanol } from "../nombres";

describe("nombres de equipo en español", () => {
  it("traduce selecciones y pone tildes a los clubes, en cualquier nivel", () => {
    const partido = {
      fixture: { id: 1, venue: { id: 9, name: "Spain Park" } },
      league: { id: 5, name: "UEFA Nations League", logo: "l.png" },
      teams: {
        home: { id: 9, name: "Spain", logo: "a.png", winner: null },
        away: { id: 777, name: "Belgium", logo: "b.png", winner: null },
      },
    };
    const r = equiposEnEspanol([partido]);
    const club = equiposEnEspanol([{ team: { id: 530, name: "Atletico Madrid", logo: "c.png" } }]);
    expect(r[0].teams.home.name).toBe("España");
    expect(r[0].teams.away.name).toBe("Bélgica");
    expect(club[0].team.name).toBe("Atlético Madrid");
    // Lo que no es un equipo no se toca (estadio sin logo, liga sin traducción).
    expect(r[0].fixture.venue.name).toBe("Spain Park");
    expect(r[0].league.name).toBe("UEFA Nations League");
    // No muta el original.
    expect(partido.teams.home.name).toBe("Spain");
  });

  it("los jugadores (con photo, sin logo) no se tocan", () => {
    const j = { player: { id: 1, name: "Brazil", photo: "p.png" } };
    expect(equiposEnEspanol(j)).toBe(j);
  });

  it("sin nada que cambiar, devuelve el mismo objeto", () => {
    const x = [{ team: { id: 529, name: "Barcelona", logo: "x" } }];
    expect(equiposEnEspanol(x)).toBe(x);
  });
});
