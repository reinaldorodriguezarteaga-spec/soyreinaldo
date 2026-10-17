import { describe, expect, it } from "vitest";
import { medallasDe, type FilaJornadaJugador } from "../medallas";

const f = (user_id: string, matchday: number, puntos: number, extra: Partial<FilaJornadaJugador> = {}): FilaJornadaJugador => ({
  user_id,
  matchday,
  puntos,
  exactos: 0,
  signos: 0,
  jugados: 10,
  partidos: 10,
  terminada: true,
  ...extra,
});

describe("medallas", () => {
  const filas = [
    f("ana", 1, 20, { exactos: 3 }),
    f("rei", 1, 15),
    f("ana", 2, 10, { signos: 10 }),
    f("rei", 2, 18),
    f("ana", 3, 30, { terminada: false, signos: 10, exactos: 5 }), // en curso: no cuenta
    f("ana", 4, 5),
    f("ana", 5, 5),
  ];
  it("mejor de la jornada, francotirador, pleno y le ganó a Reinaldo", () => {
    const m = Object.fromEntries(medallasDe(filas, "ana", "rei").map((x) => [x.clave, x.veces]));
    expect(m).toEqual({ mejor: 3, francotirador: 1, pleno: 1, constancia: 1, reinaldo: 1 });
  });
  it("Reinaldo no se gana a sí mismo; sin medallas no devuelve nada", () => {
    expect(medallasDe(filas, "rei", "rei").map((x) => x.clave)).toEqual(["mejor"]);
    expect(medallasDe(filas, "nadie", "rei")).toEqual([]);
  });
});
