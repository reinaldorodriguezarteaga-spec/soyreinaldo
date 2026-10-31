import { describe, expect, it } from "vitest";
import { equiposEnEspanol, nombreCorto } from "../nombres";

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

describe("nombreCorto", () => {
  it("el apellido, sin inicial", () => {
    expect(nombreCorto("Kylian Mbappé")).toBe("Mbappé");
    expect(nombreCorto("K. Mbappé")).toBe("Mbappé");
    expect(nombreCorto("Dani Olmo")).toBe("Olmo");
    expect(nombreCorto("Pau Cubarsí Paredes")).toBe("Cubarsí");
    expect(nombreCorto("A. Rüdiger")).toBe("Rüdiger");
  });

  it("con dos apellidos, el primero", () => {
    expect(nombreCorto("Giuliano Simeone Baldini")).toBe("Simeone");
    expect(nombreCorto("Pablo Barrios Rivas")).toBe("Barrios");
    expect(nombreCorto("Andrés Felipe Dávila Mosquera")).toBe("Dávila");
    expect(nombreCorto("Luís Manuel Ferreira de Castro")).toBe("de Castro");
  });

  it("respeta las partículas", () => {
    expect(nombreCorto("Marten de Roon")).toBe("de Roon");
    expect(nombreCorto("F. de Jong")).toBe("de Jong");
    expect(nombreCorto("Virgil van Dijk")).toBe("van Dijk");
  });

  it("los de una palabra, tal cual", () => {
    expect(nombreCorto("Endrick")).toBe("Endrick");
    expect(nombreCorto("Pedri")).toBe("Pedri");
  });

  it("alias de los que se conocen de otra forma", () => {
    expect(nombreCorto("Vinícius Júnior")).toBe("Vini Jr.");
    expect(nombreCorto("Endrick Felipe Moreira de Sousa")).toBe("Endrick");
    expect(nombreCorto("Lamine Yamal")).toBe("Lamine Yamal");
    expect(nombreCorto("Gabriel Jesus")).toBe("Gabriel Jesus");
  });

  it("sufijos brasileños, con el nombre", () => {
    expect(nombreCorto("Gabriel Neto")).toBe("Gabriel Neto");
  });
});
