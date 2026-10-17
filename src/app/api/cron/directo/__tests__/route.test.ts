import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Fixture } from "@/lib/sports/api-football";

const { cerca, vivos, porIds, operaciones, previas, fallos } = vi.hoisted(() => ({
  cerca: vi.fn(), vivos: vi.fn(), porIds: vi.fn(),
  operaciones: [] as { tabla: string; accion: string; signal?: AbortSignal }[],
  previas: [] as { fixture_id: number; firma: string; data: Fixture }[],
  fallos: new Set<string>(),
}));
vi.mock("@/lib/sports/api-football", () => ({
  competicionConPartidoCerca: cerca, getPartidosEnJuego: vivos, getPartidosPorIdsEnVivo: porIds,
  isLive: (f: Fixture) => f.fixture.status.short === "1H",
  isFinal: (f: Fixture) => f.fixture.status.short === "FT",
}));
vi.mock("@/lib/sports/competitions", () => ({ COMPETITIONS: [{ leagueId: 140 }] }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (tabla: string) => {
    const operacion = { tabla, accion: "", signal: undefined as AbortSignal | undefined };
    const query = {
      select: () => { operacion.accion = "select"; return query; },
      upsert: () => { operacion.accion = "upsert"; return query; },
      delete: () => { operacion.accion = "delete"; return query; },
      lt: () => query,
      abortSignal: (signal: AbortSignal) => { operacion.signal = signal; return query; },
      then: (resolve: (v: unknown) => unknown) => {
        operaciones.push(operacion);
        return Promise.resolve({ data: operacion.accion === "select" ? previas : null,
          error: fallos.has(`${tabla}:${operacion.accion}`) ? { message: "Fallo" } : null }).then(resolve);
      },
    };
    return query;
  } }),
}));
import { GET } from "../route";

const partido = (id: number, estado = "1H") => ({
  fixture: { id, status: { short: estado, elapsed: 10 } },
  league: { id: 140 }, goals: { home: 1, away: 0 },
}) as Fixture;
const peticion = () => new Request("http://localhost/api/cron/directo", { headers: { authorization: "Bearer secreto" } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.stubEnv("CRON_SECRET", "secreto");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "servicio");
  operaciones.length = previas.length = 0;
  fallos.clear();
  cerca.mockReset().mockResolvedValue(true);
  vivos.mockReset().mockResolvedValue([partido(1)]);
  porIds.mockReset().mockResolvedValue([partido(2, "FT")]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("cron del directo", () => {
  it("omite cierres por id sin presupuesto, pero guarda el marcador y el latido", async () => {
    cerca.mockImplementation(async () => { vi.setSystemTime(3_000); return true; });
    vivos.mockImplementation(async () => { vi.setSystemTime(9_000); return [partido(1)]; });
    previas.push({ fixture_id: 2, firma: "anterior", data: partido(2) });
    const r = await GET(peticion());
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ parcial: true, escritos: 1 });
    expect(porIds).not.toHaveBeenCalled();
    expect(operaciones.some((o) => o.tabla === "directo_latido")).toBe(true);
    expect(operaciones.every((o) => o.signal instanceof AbortSignal)).toBe(true);
  });
  it("sin partidos cerca no llama a API-Football y deja el latido", async () => {
    cerca.mockResolvedValue(false);
    expect(await (await GET(peticion())).json()).toMatchObject({ activas: 0, parcial: false });
    expect(vivos).not.toHaveBeenCalled();
    expect(porIds).not.toHaveBeenCalled();
    expect(operaciones.some((o) => o.tabla === "directo_latido")).toBe(true);
  });
  it("no da latido a una actualización que no se ha podido guardar", async () => {
    fallos.add("partidos_directo:upsert");
    expect(await (await GET(peticion())).json()).toMatchObject({ parcial: true, escritos: 0 });
    expect(operaciones.some((o) => o.tabla === "directo_latido")).toBe(false);
  });
  it("consulta una vez los desaparecidos si sobra tiempo", async () => {
    previas.push({ fixture_id: 2, firma: "anterior", data: partido(2) });
    expect(await (await GET(peticion())).json()).toMatchObject({ parcial: false, escritos: 2, terminados: 1 });
    expect(porIds).toHaveBeenCalledExactlyOnceWith([2], expect.any(AbortSignal));
  });
});
