import { describe, expect, it } from "vitest";
import { emailRecordatorio, pendientesPorUsuario } from "../recordatorio";

const p = (id: number, local = "Barcelona", visitante = "Racing Santander") => ({
  id,
  kickoffAt: "2026-10-09T19:00:00Z",
  local,
  visitante,
});

describe("recordatorio de la quiniela", () => {
  it("solo lista lo que cada usuario NO ha pronosticado", () => {
    const r = pendientesPorUsuario(
      [p(1), p(2)],
      [
        { userId: "a", matchId: 1 },
        { userId: "b", matchId: 1 },
        { userId: "b", matchId: 2 },
      ],
      ["a", "b", "c"],
    );
    expect(r.get("a")?.map((m) => m.id)).toEqual([2]);
    expect(r.has("b")).toBe(false); // lo tiene todo: no se le avisa
    expect(r.get("c")?.map((m) => m.id)).toEqual([1, 2]);
  });

  it("el email escapa nombres y lleva el enlace de baja", () => {
    const { subject, html } = emailRecordatorio({
      nombre: "<script>",
      partidos: [p(1, "A & B")],
      urlPronosticar: "https://x/quiniela-liga/partidos",
      urlBaja: "https://x/baja-recordatorios?token=t",
    });
    expect(subject).toContain("Te falta 1 pronóstico");
    expect(html).not.toContain("<script>");
    expect(html).toContain("A &amp; B");
    expect(html).toContain("baja-recordatorios?token=t");
  });
});
