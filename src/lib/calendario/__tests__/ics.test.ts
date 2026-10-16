import { describe, expect, it } from "vitest";
import { calendarioIcs } from "../ics";

const ahora = Date.parse("2026-10-16T20:00:00Z");

describe("calendario .ics", () => {
  it("un partido por evento, con hora UTC y dos horas de duración", () => {
    const ics = calendarioIcs(
      [
        {
          id: 1,
          inicio: "2026-10-17T16:30:00+00:00",
          local: "Real Betis",
          visitante: "Barcelona",
          competicion: "LaLiga",
          url: "https://www.soyreinaldo.com/liga/laliga/partido/1",
          resultado: null,
        },
        {
          id: 2,
          inicio: "2026-10-14T19:00:00+00:00",
          local: "Galatasaray",
          visitante: "Barcelona",
          competicion: "Champions League",
          url: "https://x/2",
          resultado: "1–4",
        },
      ],
      ahora,
      "Mis equipos, Soy Reinaldo",
    );
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("X-WR-CALNAME:Mis equipos\\, Soy Reinaldo");
    expect(ics).toContain("DTSTART:20261017T163000Z");
    expect(ics).toContain("DTEND:20261017T183000Z");
    expect(ics).toContain("SUMMARY:⚽ Real Betis – Barcelona");
    expect(ics).toContain("SUMMARY:Galatasaray 1–4 Barcelona");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    for (const l of ics.split("\r\n")) {
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    }
  });
});
