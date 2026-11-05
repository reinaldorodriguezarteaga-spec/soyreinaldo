import { describe, expect, it } from "vitest";
import { sinQuiniela, termino } from "../termino";

describe("«Adivina el marcador» en la app", () => {
  it("cambia quiniela con frases que cuadran", () => {
    expect(sinQuiniela("Juega la quiniela gratis")).toBe("Juega a Adivina el marcador gratis");
    expect(sinQuiniela("Jugar a la quiniela")).toBe("Jugar a Adivina el marcador");
    expect(sinQuiniela("← Ir a la quiniela")).toBe("← Ir a Adivina el marcador");
    expect(sinQuiniela("Quiniela de la Champions")).toBe("Adivina el marcador de la Champions");
    expect(sinQuiniela("Quiniela · LaLiga 2026-27")).toBe("Adivina el marcador · LaLiga 2026-27");
    expect(sinQuiniela("La Quiniela de LaLiga.")).toBe("Adivina el marcador de LaLiga.");
    expect(sinQuiniela("Elige tu quiniela")).toBe("Elige tu liga");
    expect(sinQuiniela("¿Te han invitado a una quiniela privada?")).toBe("¿Te han invitado a una liga privada?");
    expect(sinQuiniela("Mis quinielas")).toBe("Mis ligas");
    expect(sinQuiniela("La Quiniela de los conos 26-27")).toBe("La liga de los conos 26-27");
    expect(sinQuiniela("Postquiniela by CarBarça")).toBe("Postliga by CarBarça");
    expect(sinQuiniela("🏆 QUINIELA")).toBe("🏆 ADIVINA EL MARCADOR");
    expect(sinQuiniela("Ver la quiniela")).toBe("Ver la clasificación");
  });

  it("cambia pronósticos", () => {
    expect(sinQuiniela("Pronósticos")).toBe("Marcadores");
    expect(sinQuiniela("Pronosticar")).toBe("Jugar");
    expect(sinQuiniela("Tu pronóstico:")).toBe("Tu marcador:");
    expect(sinQuiniela("No pronosticaste este partido.")).toBe("No pusiste marcador a este partido.");
    expect(sinQuiniela("Aún no has pronosticado este partido.")).toBe("Aún no has puesto marcador a este partido.");
    expect(sinQuiniela(" ya ha pronosticado. ¿Le ganas?")).toBe(" ya ha puesto su marcador. ¿Le ganas?");
    expect(sinQuiniela(" aún no lo ha pronosticado.")).toBe(" aún no ha puesto su marcador.");
    expect(sinQuiniela("Este partido entra en la quiniela de la Champions. Pronostica el marcador y sube en la clasificación.")).toBe(
      "Este partido entra en Adivina el marcador de la Champions: pon tu marcador y sube en la clasificación.",
    );
    expect(sinQuiniela("Juegos y ligas de pronósticos (quinielas) gratuitas")).toBe("Juegos y ligas de Adivina el marcador gratuitas");
  });

  it("la web no cambia", () => {
    expect(termino("Elige tu quiniela", false)).toBe("Elige tu quiniela");
    expect(termino("Pronósticos", false)).toBe("Pronósticos");
  });
});
