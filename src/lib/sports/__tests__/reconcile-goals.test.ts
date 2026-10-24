import { describe, expect, it } from "vitest";
import { reconcileGoals, type FixtureGoal } from "../api-football";

// Al-Faisaly 1-3 Al-Nassr (23-oct-2026): el autogol de Girotto (Al-Faisaly)
// llega del API con el equipo beneficiado, Al-Nassr.
const gol = (minute: number, teamId: number, player: string, detail = "Normal Goal"): FixtureGoal => ({
  minute,
  teamId,
  player,
  detail,
  assist: null,
});
const goles = [gol(4, 2939, "Al-Hamdan"), gol(49, 2939, "Girotto", "Own Goal"), gol(66, 2930, "Bongonda"), gol(79, 2939, "Borges")];

describe("reconcileGoals", () => {
  it("el autogol cuenta para el equipo que trae el API y no se come otro gol", () => {
    const r = reconcileGoals(goles, { homeId: 2930, awayId: 2939, scoreHome: 1, scoreAway: 3 });
    expect(r.map((g) => g.player)).toEqual(["Al-Hamdan", "Girotto", "Bongonda", "Borges"]);
  });

  it("quita el gol fantasma más reciente si sobra", () => {
    const r = reconcileGoals(goles, { homeId: 2930, awayId: 2939, scoreHome: 1, scoreAway: 2 });
    expect(r.map((g) => g.player)).toEqual(["Al-Hamdan", "Girotto", "Bongonda"]);
  });
});
