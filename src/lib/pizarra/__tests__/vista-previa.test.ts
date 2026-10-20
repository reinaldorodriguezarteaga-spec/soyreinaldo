import { describe, expect, it } from "vitest";
import { estadoInicial } from "../estado";
import { huecos } from "../formaciones";
import { fichasVistaPrevia } from "../vista-previa";

describe("fichas de la vista previa", () => {
  it("respeta formación, lado, movimientos y colores sin modificar el estado", () => {
    const e = estadoInicial();
    e.formacion.visitante = "3-5-2";
    e.once.local[3] = 1;
    e.once.visitante[1] = 999;
    e.movidos["local:3"] = { x: 0.6, y: 0.2 };
    e.colores.local = "#a50044";
    const copia = structuredClone(e);
    const fichas = fichasVistaPrevia(e, { local: [{ id: 1, name: "Dani Olmo", number: 20 }], visitante: [] });
    // Solo los dos huecos con jugador: los vacíos no se pintan.
    expect(fichas).toHaveLength(2);
    expect(fichas[0]).toMatchObject({ lado: "local", indice: 3, x: 0.6, y: 0.2, dorsal: 20, apellido: "Olmo", color: "#a50044" });
    // Jugador que no está en la plantilla: círculo sin dorsal ni nombre.
    expect(fichas[1]).toMatchObject({
      lado: "visitante",
      indice: 1,
      x: huecos("3-5-2", "visitante")[1].x,
      y: huecos("3-5-2", "visitante")[1].y,
      dorsal: null,
      apellido: "",
    });
    expect(e).toEqual(copia);
  });
});
