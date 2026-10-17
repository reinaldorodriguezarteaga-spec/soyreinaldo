import { describe, expect, it } from "vitest";
import { tiempoDisponible } from "../presupuesto-directo";

describe("presupuesto del cron de directo", () => {
  it("limita cada llamada y reserva tiempo para escrituras y latido", () => {
    expect(tiempoDisponible(11_000, 6_000, 2_000, 0)).toBe(6_000);
    expect(tiempoDisponible(11_000, 6_000, 2_000, 7_500)).toBe(1_500);
    expect(tiempoDisponible(11_000, 3_000, 750, 10_000)).toBe(250);
  });
  it("omite trabajo opcional cuando no queda margen", () => {
    expect(tiempoDisponible(11_000, 6_000, 3_750, 8_000)).toBe(0);
    expect(tiempoDisponible(11_000, 3_000, 0, 12_000)).toBe(0);
  });
});
