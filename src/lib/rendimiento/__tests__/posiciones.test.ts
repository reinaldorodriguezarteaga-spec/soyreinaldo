import { describe, expect, it } from "vitest";
import { conSuplentes, resumenPorRol, rolesDeAlineacion } from "../posiciones";

/** Titulares con casillas a partir de "4-3-3" (columnas de izquierda a derecha). */
function once(formacion: string) {
  const lineas = [1, ...formacion.split("-").map(Number)];
  let id = 1;
  return lineas.flatMap((n, f) => Array.from({ length: n }, (_, c) => ({ id: id++, grid: `${f + 1}:${c + 1}` })));
}

describe("rendimiento por posición", () => {
  it("formación nuestra: el rol de su hueco", () => {
    const r = rolesDeAlineacion("4-3-3", once("4-3-3"));
    expect(r.get(1)).toBe("POR");
    expect(r.get(2)).toBe("LI");
    expect(r.get(5)).toBe("LD");
    expect(r.get(9)).toBe("EI");
    expect(r.get(10)).toBe("DC");
    expect(r.get(11)).toBe("ED");
  });

  it("formación rara: por fila y banda", () => {
    const r = rolesDeAlineacion("3-1-4-2", once("3-1-4-2"));
    expect(r.get(1)).toBe("POR");
    expect(r.get(2)).toBe("DFC");
    expect(r.get(5)).toBe("MCD");
    expect(r.get(6)).toBe("MI");
    expect(r.get(9)).toBe("MD");
    expect(r.get(10)).toBe("DC");
  });

  it("el suplente hereda el rol del que sale (también en cadena)", () => {
    const base = rolesDeAlineacion("4-3-3", once("4-3-3"));
    const r = conSuplentes(base, [
      { teamId: 1, sale: 9, entra: 20, minuto: 60 },
      { teamId: 1, sale: 20, entra: 21, minuto: 80 },
    ]);
    expect(r.get(20)).toBe("EI");
    expect(r.get(21)).toBe("EI");
  });

  it("sin casillas: ningún rol", () => {
    expect(rolesDeAlineacion("4-3-3", [{ id: 1, grid: null }]).size).toBe(0);
  });

  it("resumen: por rol, con G+A cada 90 y nota media", () => {
    const r = resumenPorRol([
      { rol: "EI", minutos: 90, goles: 1, asistencias: 1, nota: 8 },
      { rol: "EI", minutos: 90, goles: 0, asistencias: 0, nota: 7 },
      { rol: "DC", minutos: 45, goles: 1, asistencias: 0, nota: null },
    ]);
    expect(r[0]).toMatchObject({ rol: "EI", nombre: "Extremo izquierdo", partidos: 2, goles: 1, ga90: 1, nota: 7.5 });
    expect(r[1]).toMatchObject({ rol: "DC", ga90: 2, nota: null });
  });
});
