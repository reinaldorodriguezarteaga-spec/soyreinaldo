import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

const upsert = vi.fn(async () => ({ error: null }));
const abortar = vi.fn();
let fila: { data: unknown; updated_at: string } | null = null;
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert,
      select: () => ({
        eq: () => ({ abortSignal: (signal: AbortSignal) => { abortar(signal); return { maybeSingle: async () => ({ data: fila }) }; } }),
      }),
    }),
  }),
}));

const { writeCache, readCache } = await import("../sports-cache");

describe("sports_cache", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    upsert.mockClear();
    fila = null;
    abortar.mockClear();
  });

  it("no pisa datos buenos con un vacío (API sin cuota)", async () => {
    await writeCache("standings:laliga", []);
    await writeCache("standings:laliga", null);
    expect(upsert).not.toHaveBeenCalled();
    await writeCache("standings:laliga", [{ rank: 1 }]);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("propaga el presupuesto del cron a Supabase", async () => {
    const signal = AbortSignal.timeout(3_000);
    await readCache("fixtures:laliga", 2400, signal);
    expect(abortar).toHaveBeenCalledWith(signal);
  });

  it("una entrada vacía cuenta como 'sin dato' para caer a la API", async () => {
    fila = { data: [], updated_at: new Date().toISOString() };
    expect(await readCache("standings:laliga", 2400)).toBeNull();
    fila = { data: [{ rank: 1 }], updated_at: new Date().toISOString() };
    expect(await readCache("standings:laliga", 2400)).toEqual([{ rank: 1 }]);
  });
});
