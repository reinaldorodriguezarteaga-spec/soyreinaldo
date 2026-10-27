import { describe, expect, it } from "vitest";
import { EDAD_RETIRO, crearCarrera, decidir, elegirOpcion, pasarAOfertas, puedeRetirarse, resumen, type Estado } from "../motor";
import { clubPorId } from "../clubes";

/** Juega una carrera entera: siempre la primera opción y la mejor oferta. */
function jugar(semilla: number, retirarseA?: number): Estado {
  let e = crearCarrera({ nombre: "Prueba", nacion: "es", posicion: "DEL", clubId: 534, semilla });
  for (let i = 0; i < 200 && e.fase !== "fin"; i++) {
    if (e.fase === "escenario") e = elegirOpcion(e, 0);
    else if (e.fase === "resultado") e = pasarAOfertas(e);
    else if (retirarseA != null && e.edad + 1 >= retirarseA && puedeRetirarse(e)) e = decidir(e, { tipo: "retirarse" });
    else {
      const mejor = [...e.ofertas].sort((a, b) => clubPorId(a)!.escalon - clubPorId(b)!.escalon)[0];
      e = mejor && (e.sinRenovar || clubPorId(mejor)!.escalon < e.escalonClub) ? decidir(e, { tipo: "fichar", clubId: mejor }) : decidir(e, { tipo: "seguir" });
    }
  }
  return e;
}

describe("modo carrera", () => {
  it("empieza a los 17 en segunda, con media de chaval", () => {
    const e = crearCarrera({ nombre: "", nacion: "ar", posicion: "MED", clubId: 534, semilla: 7 });
    expect(e.edad).toBe(17);
    expect(e.escalonClub).toBe(5);
    expect(e.media).toBeGreaterThanOrEqual(58);
    expect(e.media).toBeLessThanOrEqual(63);
    expect(e.nombre).toBe("El Crack");
    expect(e.escenario?.opciones.length).toBeGreaterThanOrEqual(2);
  });

  it("una carrera llega como mucho hasta los 41", () => {
    for (let s = 1; s <= 30; s++) {
      const e = jugar(s);
      expect(e.fase).toBe("fin");
      expect(e.historial[0].edad).toBe(17);
      expect(e.historial.at(-1)!.edad).toBe(EDAD_RETIRO - 1);
      expect(e.historial.every((t) => t.media >= 40 && t.media <= 97)).toBe(true);
    }
  });

  it("solo se puede retirar desde los 34", () => {
    const e = jugar(3, 34);
    expect(e.fase).toBe("fin");
    expect(e.historial.at(-1)!.edad).toBe(33);
  });

  it("misma semilla, misma carrera", () => {
    expect(resumen(jugar(11))).toEqual(resumen(jugar(11)));
  });

  it("sin rendimiento no llegan ofertas de un club mejor", () => {
    let e = crearCarrera({ nombre: "", nacion: "es", posicion: "DEL", clubId: 534, semilla: 5 });
    e = elegirOpcion(e, 0);
    e = { ...e, media: 60, historial: [...e.historial.slice(0, -1), { ...e.historial.at(-1)!, nota: 6.0 }] };
    e = pasarAOfertas(e);
    expect(e.ofertas.every((id) => clubPorId(id)!.escalon >= 5)).toBe(true);
  });
});
