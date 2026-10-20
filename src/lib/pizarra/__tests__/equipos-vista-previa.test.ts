import { afterEach, describe, expect, it, vi } from "vitest";

const { lista, partido } = vi.hoisted(() => ({ lista: vi.fn(), partido: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../equipos", () => ({ equiposPizarra: lista }));
vi.mock("@/lib/sports/api-football", () => ({ getFixtureById: partido }));
const { equiposVistaPrevia } = await import("../equipos-vista-previa");
const local = { id: 1, name: "Local", logo: "" };
const visitante = { id: 2, name: "Visitante", logo: "" };

afterEach(() => vi.resetAllMocks());

describe("equipos admitidos en la vista previa", () => {
  it("resuelve solo los equipos de la lista, sin consultar ids al API", async () => {
    lista.mockResolvedValue([{ equipos: [local, visitante] }]);
    expect(await equiposVistaPrevia("1", "2")).toEqual({ local, visitante });
    expect(await equiposVistaPrevia("999", "2")).toBeNull();
    expect(await equiposVistaPrevia(undefined, undefined)).toBeNull();
    expect(partido).not.toHaveBeenCalled();
  });

  it("admite los equipos de un partido de nuestras competiciones", async () => {
    partido.mockResolvedValue({ league: { id: 140 }, teams: { home: local, away: visitante } });
    expect(await equiposVistaPrevia("999", "888", "7")).toEqual({ local, visitante });
    expect(partido).toHaveBeenCalledWith(7);
    expect(lista).not.toHaveBeenCalled();
  });

  it("un partido ajeno no permite equipos inventados", async () => {
    partido.mockResolvedValue({ league: { id: -1 }, teams: { home: local, away: visitante } });
    lista.mockResolvedValue([]);
    expect(await equiposVistaPrevia("1", "2", "7")).toBeNull();
  });
});
