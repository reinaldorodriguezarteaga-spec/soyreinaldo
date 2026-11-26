import { describe, expect, it } from "vitest";
import type { Fixture } from "@/lib/sports/api-football";
import { elegirOtros } from "../otros-partidos";

function fx(id: number, round: string, date: string): Fixture {
  return {
    fixture: { id, date, status: { long: "", short: "NS", elapsed: null }, venue: { name: null, city: null } },
    league: { id: 1, name: "", logo: "", round },
    teams: {
      home: { id: id * 10, name: `L${id}`, logo: "", winner: null },
      away: { id: id * 10 + 1, name: `V${id}`, logo: "", winner: null },
    },
    goals: { home: null, away: null },
  };
}

describe("elegirOtros", () => {
  it("solo la misma jornada, sin el partido actual, en orden de fecha", () => {
    const todos = [
      fx(1, "J5", "2026-11-26T20:00:00Z"),
      fx(2, "J5", "2026-11-25T17:45:00Z"),
      fx(3, "J6", "2026-11-26T20:00:00Z"),
      fx(4, "J5", "2026-11-25T20:00:00Z"),
    ];
    const r = elegirOtros(todos, { id: 1, round: "J5", date: "2026-11-26T20:00:00Z" });
    expect(r.map((f) => f.fixture.id)).toEqual([2, 4]);
  });

  it("con más de 8, se queda con los más cercanos al actual", () => {
    const todos = Array.from({ length: 18 }, (_, i) =>
      fx(i + 1, "League Stage - 5", `2026-11-${i < 9 ? 25 : 26}T${i % 2 ? "20" : "17"}:00:00Z`),
    );
    const r = elegirOtros(todos, { id: 18, round: "League Stage - 5", date: "2026-11-26T20:00:00Z" });
    expect(r).toHaveLength(8);
    expect(r.every((f) => f.fixture.date.startsWith("2026-11-26"))).toBe(true);
  });
});
