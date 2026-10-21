import { describe, expect, it } from "vitest";
import { JORNADAS_CHAMPIONS, jornadaChampions } from "../champions";

describe("quiniela de la Champions", () => {
  it("rondas del API → jornadas", () => {
    expect(jornadaChampions("League Stage - 4")).toBe(4);
    expect(jornadaChampions("Round of 16")).toBe(10);
    expect(jornadaChampions("Final")).toBe(13);
    expect(jornadaChampions("Play-offs")).toBeNull(); // la previa de agosto
    expect(jornadaChampions("3rd Qualifying Round")).toBeNull();
  });
  it("cada jornada tiene su etiqueta", () => {
    expect(JORNADAS_CHAMPIONS.map((j) => j.n)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  });
});
