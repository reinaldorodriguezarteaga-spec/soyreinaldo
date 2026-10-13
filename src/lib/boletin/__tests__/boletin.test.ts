import { describe, expect, it } from "vitest";
import { boletinConContenido, emailBoletin, type DatosBoletin } from "../boletin";

const base: DatosBoletin = {
  nombre: "Ana",
  analisis: [{ titulo: "Gana el Madrid, llora el Madrid", entradilla: "El Madrid sacó su partido <adelante>", url: "https://x/a" }],
  partidos: [{ fecha: "2026-10-17T19:00:00Z", local: "Barcelona", visitante: "Sevilla", url: "https://x/p" }],
  quiniela: {
    jornada: 9,
    primerPartido: "2026-10-16T19:00:00Z",
    top3: [{ nombre: "luismaugas", puntos: 109 }, { nombre: "aardilag", puntos: 91 }, { nombre: "Daniel", puntos: 88 }],
    miPuesto: { puesto: 7, de: 31, puntos: 70 },
  },
  urlQuiniela: "https://x/q",
  urlWeb: "https://x",
  urlBaja: "https://x/baja?token=t",
};

describe("boletín semanal", () => {
  it("asunto con el análisis y todo el contenido, escapado", () => {
    const { subject, html } = emailBoletin(base);
    expect(subject).toBe("⚽ Esta semana en Soy Reinaldo: Gana el Madrid, llora el Madrid");
    expect(html).toContain("&lt;adelante&gt;");
    expect(html).toContain("Barcelona – Sevilla");
    expect(html).toContain("La jornada 9 empieza el viernes");
    expect(html).toContain("🥇 luismaugas (109)");
    expect(html).toContain("Tú vas <strong>7º de 31</strong>");
    expect(html).toContain("https://x/baja?token=t");
  });

  it("quien no juega recibe la invitación; sin análisis, asunto genérico", () => {
    const { subject, html } = emailBoletin({
      ...base,
      analisis: [],
      quiniela: { ...base.quiniela!, miPuesto: null },
    });
    expect(subject).toBe("⚽ Esta semana en Soy Reinaldo: partidazos y quiniela");
    expect(html).toContain("¿Aún no juegas?");
    expect(html).toContain("Jugar a la quiniela");
  });

  it("sin nada que contar, no se envía", () => {
    expect(boletinConContenido({ analisis: [], partidos: [], quiniela: null })).toBe(false);
    expect(boletinConContenido(base)).toBe(true);
  });
});
