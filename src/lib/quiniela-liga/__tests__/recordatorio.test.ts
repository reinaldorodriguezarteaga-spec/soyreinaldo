import { describe, expect, it } from "vitest";
import { avisoRecordatorio, cuando, emailRecordatorio, emailResumenJornada, pendientesPorUsuario } from "../recordatorio";

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

  it("resumen de jornada: puntos, puesto y si sube o baja", () => {
    const base = {
      nombre: "Rei",
      jornada: 8,
      liga: "Conos",
      exactos: 2,
      aciertos: 3,
      jugados: 10,
      totalJugadores: 33,
      urlTarjeta: "https://x/mi-jornada/rei/8",
      urlClasificacion: "https://x/quiniela-liga/ranking",
      urlBaja: "https://x/baja?token=t",
    };
    const sube = emailResumenJornada({ ...base, puntos: 16, puestoAhora: 5, puestoAntes: 8 });
    expect(sube.subject).toBe("🏆 Jornada 8: 16 puntos · vas 5º");
    expect(sube.html).toContain("subes 3 puestos");
    expect(sube.html).toContain("mi-jornada/rei/8");
    const baja = emailResumenJornada({ ...base, puntos: 2, puestoAhora: 9, puestoAntes: 8 });
    expect(baja.html).toContain("bajas 1 puesto");
  });
});

describe("aviso al móvil del recordatorio", () => {
  // 4-nov-2026 a las 10:00 en España (09:00 UTC).
  const ahora = new Date("2026-11-04T09:00:00Z");
  const m = (id: number, kickoffAt: string) => ({ id, kickoffAt, local: "Barça", visitante: "Madrid" });

  it("el día antes avisa de los de mañana, sin la palabra quiniela", () => {
    const a = avisoRecordatorio([m(1, "2026-11-05T20:00:00Z"), m(2, "2026-11-05T18:00:00Z")], ahora);
    expect(a.body).toBe("Mañana hay jornada: recuerda rellenar tus 2 pronósticos.");
    expect(`${a.title} ${a.body}`.toLowerCase()).not.toContain("quiniela");
  });
  it("si hay partidos hoy, manda lo de hoy", () => {
    const a = avisoRecordatorio([m(1, "2026-11-04T20:00:00Z"), m(2, "2026-11-05T20:00:00Z")], ahora);
    expect(a.body).toBe("Barça - Madrid se juega hoy. ¡No te quedes sin puntos!");
  });
  it("medianoche en España cuenta como mañana", () => {
    expect(cuando("2026-11-04T23:30:00Z", ahora)).toBe("mañana");
    expect(cuando("2026-11-04T22:30:00Z", ahora)).toBe("hoy");
  });
});
