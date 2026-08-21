import { describe, expect, it } from "vitest";
import { aNumero, formatearTotal, sumarSeguidores } from "../totales";

describe("interpretar cifras escritas a mano", () => {
  it("entiende los miles con K", () => {
    expect(aNumero("60K")).toBe(60000);
    expect(aNumero("60k")).toBe(60000);
  });

  it("entiende la coma decimal española", () => {
    expect(aNumero("9,8K")).toBe(9800);
    expect(aNumero("54,5K")).toBe(54500);
  });

  it("entiende los millones", () => {
    expect(aNumero("1,2M")).toBe(1200000);
    expect(aNumero("+8,4M")).toBe(8400000);
  });

  it("ignora el + de 'y pico'", () => {
    expect(aNumero("+9.000")).toBe(9000);
  });

  it("trata el punto como separador de millar cuando no hay sufijo", () => {
    expect(aNumero("169.100")).toBe(169100);
    expect(aNumero("1.234")).toBe(1234);
  });

  it("devuelve null con lo que no es una cifra", () => {
    expect(aNumero("")).toBeNull();
    expect(aNumero(null)).toBeNull();
    expect(aNumero("muchos")).toBeNull();
  });
});

describe("total de seguidores", () => {
  it("suma el caso real del 20-ago", () => {
    // Lo que había en el panel ese día. El total escrito a mano decía
    // 169.100; la suma real es 169.800.
    const r = sumarSeguidores(["60K", "50K", "40K", "10K", "9,8K"]);
    expect(r.total).toBe(169800);
    expect(r.texto).toBe("+169.800");
    expect(r.ignoradas).toBe(0);
  });

  it("no se cae si una cifra está mal escrita: la ignora y sigue", () => {
    const r = sumarSeguidores(["60K", "pendiente", "40K"]);
    expect(r.total).toBe(100000);
    expect(r.ignoradas).toBe(1);
  });

  it("con todo vacío da cero, no un error", () => {
    expect(sumarSeguidores([null, "", undefined]).total).toBe(0);
  });

  it("formatea a la española", () => {
    expect(formatearTotal(169800)).toBe("+169.800");
    expect(formatearTotal(1234567)).toBe("+1.234.567");
  });
});
