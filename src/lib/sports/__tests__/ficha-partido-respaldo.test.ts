import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 13-oct: con Viking-Bayern, Arsenal-Lille y Villarreal-Napoli en la 2ª parte,
// sus fichas daban 404 porque `/fixtures?id=` volvía vacío (fallo de la API)
// y la página lo leía como "este partido no existe".

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

vi.mock("../archivo", async (original) => {
  const real = await original<typeof import("../archivo")>();
  return {
    respuestaUtil: real.respuestaUtil,
    leerArchivo: async () => null,
    guardarArchivo: async () => {},
  };
});

const directo = new Map<number, unknown>();
vi.mock("../directo", async (original) => {
  const real = await original<typeof import("../directo")>();
  return {
    superponer: real.superponer,
    filasDirecto: async () => directo,
    eventosDirecto: async (id: number) =>
      (directo.get(id) as { events?: unknown[] } | undefined)?.events ?? null,
  };
});

let calendario: unknown[] | null = null;
vi.mock("../sports-cache", async (original) => {
  const real = await original<typeof import("../sports-cache")>();
  return { ...real, readCache: async () => calendario };
});

const { getFixtureById, partidoDelCalendario, _fijarRestanteParaPruebas } = await import(
  "../api-football"
);
const { CHAMPIONS_LEAGUE } = await import("../competitions");

function partido(id: number, short: string, home = 0, away = 0) {
  return {
    fixture: { id, date: "2026-10-13T19:00:00+00:00", status: { short, elapsed: 73 } },
    league: { id: 2, round: "League Stage - 2" },
    teams: {
      home: { id: 21732, name: "Viking", logo: "x" },
      away: { id: 157, name: "Bayern München", logo: "y" },
    },
    goals: { home, away },
  };
}

describe("ficha de partido sin respuesta de la API", () => {
  beforeEach(() => {
    process.env.API_FOOTBALL_KEY = "test";
    _fijarRestanteParaPruebas(null);
    directo.clear();
    calendario = null;
    // La API no contesta (corte de red / timeout).
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("timeout", "TimeoutError");
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("en juego: sale de la tabla del directo en vez de null", async () => {
    directo.set(1635742, { ...partido(1635742, "2H", 0, 2), events: [] });
    const fx = await getFixtureById(1635742, 20);
    expect(fx?.fixture.id).toBe(1635742);
    expect(fx?.fixture.status.short).toBe("2H");
    expect(fx?.goals).toEqual({ home: 0, away: 2 });
  });

  it("sin directo: null (la página tira entonces del calendario)", async () => {
    expect(await getFixtureById(1635742, 20)).toBeNull();
  });

  it("del calendario guardado, con el marcador del directo encima", async () => {
    calendario = [partido(1635742, "NS"), partido(1635612, "NS")];
    directo.set(1635742, partido(1635742, "2H", 1, 1));
    const fx = await partidoDelCalendario(CHAMPIONS_LEAGUE, 1635742);
    expect(fx?.fixture.status.short).toBe("2H");
    expect(fx?.goals).toEqual({ home: 1, away: 1 });
    expect(await partidoDelCalendario(CHAMPIONS_LEAGUE, 999)).toBeNull();
  });
});
