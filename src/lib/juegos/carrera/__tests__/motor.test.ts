import { describe, expect, it } from "vitest";
import { EDAD_RETIRO, crearCarrera, decidir, elegirOpcion, pasarAOfertas, puedeRetirarse, resumen, type Estado } from "../motor";
import { clubPorId } from "../clubes";
import { reproducir } from "../replay";

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

describe("rejugar una carrera (ranking)", () => {
  it("las mismas decisiones dan la misma carrera y el mismo legado", async () => {
    const { aplicar, reproducir } = await import("../replay");
    const inicio = { nombre: "Repe", nacion: "br", posicion: "MED" as const, clubId: 534, semilla: 4242, extendido: true };
    let e = crearCarrera(inicio);
    const acciones: import("../replay").Accion[] = [];
    for (let i = 0; i < 200 && e.fase !== "fin"; i++) {
      const a: import("../replay").Accion =
        e.fase === "escenario" ? { t: "opcion", i: i % e.escenario!.opciones.length }
        : e.fase === "resultado" ? { t: "ver" }
        : e.ofertas[0] && i % 3 === 0 ? { t: "fichar", id: e.ofertas[0] }
        : e.sinRenovar ? { t: "fichar", id: e.ofertas[0] } : { t: "seguir" };
      acciones.push(a);
      e = aplicar(e, a);
    }
    const r = reproducir(inicio, acciones);
    expect(r).not.toBeNull();
    expect(resumen(r!)).toEqual(resumen(e));
  });

  it("rechaza trampas: club inicial de primera, ofertas inventadas o carreras a medias", async () => {
    const { reproducir } = await import("../replay");
    expect(reproducir({ nombre: "X", nacion: "es", posicion: "DEL", clubId: 541, semilla: 1, extendido: false }, [])).toBeNull();
    expect(reproducir({ nombre: "X", nacion: "es", posicion: "DEL", clubId: 534, semilla: 1, extendido: false }, [{ t: "opcion", i: 0 }, { t: "ver" }, { t: "fichar", id: 541 }])).toBeNull();
    expect(reproducir({ nombre: "X", nacion: "es", posicion: "DEL", clubId: 534, semilla: 1, extendido: false }, [{ t: "opcion", i: 0 }])).toBeNull();
  });
});

describe("canteras", () => {
  it("si destacas en el Barça Atlètic, te ofrecen subir al primer equipo", () => {
    let e = crearCarrera({ nombre: "", nacion: "es", posicion: "MED", clubId: 712, semilla: 9 });
    e = elegirOpcion(e, 0);
    e = { ...e, media: 84, historial: [...e.historial.slice(0, -1), { ...e.historial.at(-1)!, nota: 7.6 }] };
    expect(pasarAOfertas(e).ofertas).toContain(529);
  });

  it("una cantera nunca ficha a nadie ni recibe cedidos", async () => {
    const { CLUBES_FICHAN } = await import("../clubes");
    expect(CLUBES_FICHAN.some((c) => c.matriz)).toBe(false);
  });
});

describe("versión extendida", () => {
  it("cada temporada tiene dos decisiones: pretemporada y mitad de temporada", () => {
    let e = crearCarrera({ nombre: "", nacion: "es", posicion: "DEL", clubId: 534, semilla: 21, extendido: true });
    expect(e.escenario?.mitad).toBeFalsy();
    e = elegirOpcion(e, 0);
    expect(e.fase).toBe("escenario");
    expect(e.escenario?.mitad).toBe(true);
    e = elegirOpcion(e, 0);
    expect(e.fase).toBe("resultado");
    expect(e.historial[0].invierno).toBeDefined();
    expect(e.usados.length).toBe(2);
  });
});

describe("primera vuelta (versión extendida)", () => {
  it("se juega antes de la pregunta de invierno y suma en la temporada", () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      let e = crearCarrera({ nombre: "", nacion: "es", posicion: "DEL", clubId: 534, semilla, extendido: true });
      e = elegirOpcion(e, 0);
      const ida = e.pendiente!.primeraMitad;
      expect(ida.partidos).toBeGreaterThanOrEqual(0);
      expect(ida.partidos).toBeLessThanOrEqual(22);
      e = elegirOpcion(e, 0);
      const t = e.historial[0];
      expect(t.partidos).toBeGreaterThanOrEqual(ida.partidos);
      expect(t.goles).toBeGreaterThanOrEqual(ida.goles);
    }
  });
});


describe("cesiones", () => {
  it("un joven que no juega recibe cesiones y juega la temporada en ese club", () => {
    let e = crearCarrera({ nombre: "", nacion: "es", posicion: "DEL", clubId: 546, semilla: 3 });
    e = elegirOpcion(e, 0);
    e = { ...e, historial: [...e.historial.slice(0, -1), { ...e.historial.at(-1)!, partidos: 3, nota: null }] };
    e = pasarAOfertas(e);
    expect(e.cesiones?.length).toBeGreaterThan(0);
    const destino = e.cesiones![0];
    e = decidir(e, { tipo: "ceder", clubId: destino });
    expect(e.clubId).toBe(546);
    expect(e.cesion).toBe(destino);
    e = elegirOpcion(e, 0);
    expect(e.historial.at(-1)!.cedidoEn).toBe(destino);
    expect(e.historial.at(-1)!.clubId).toBe(546);
  });

  it("no se puede ceder a un club que no lo pidió", () => {
    let e = crearCarrera({ nombre: "", nacion: "es", posicion: "DEL", clubId: 546, semilla: 3 });
    e = pasarAOfertas(elegirOpcion(e, 0));
    expect(decidir(e, { tipo: "ceder", clubId: 541 })).toBe(e);
  });
});

describe("fin del filial", () => {
  it("con 24 años no se puede seguir en una cantera", () => {
    let e = crearCarrera({ nombre: "", nacion: "es", posicion: "MED", clubId: 712, semilla: 8 });
    e = elegirOpcion({ ...e, edad: 23 }, 0);
    e = pasarAOfertas(e);
    expect(e.finFilial).toBe(true);
    expect(e.ofertas.length).toBeGreaterThanOrEqual(2);
    expect(decidir(e, { tipo: "seguir" })).toBe(e);
  });
});

describe("selección y Mundiales", () => {
  it("los torneos solo en verano de Mundial o continental, y ganarlo da el trofeo", () => {
    let torneos = 0;
    for (let s = 1; s <= 40; s++) {
      for (const t of jugar(s).historial) {
        const torneo = t.seleccion?.torneo;
        const verano = (t.anio + 1) % 4;
        if (!torneo) continue;
        torneos++;
        expect(verano === 2 || verano === 0).toBe(true);
        expect(torneo.nombre).toBe(`${verano === 2 ? "Mundial" : "Eurocopa"} ${t.anio + 1}`);
        expect(t.trofeos.includes(`${torneo.nombre} con España`)).toBe(torneo.ronda === "campeon");
      }
    }
    expect(torneos).toBeGreaterThan(0);
  });

  it("quien se retira de la selección ya no vuelve a ser convocado", () => {
    let e = crearCarrera({ nombre: "", nacion: "es", posicion: "DEL", clubId: 534, semilla: 4 });
    e = {
      ...e,
      edad: 31,
      media: 90,
      escenario: {
        id: "adios-seleccion",
        titulo: "",
        texto: "",
        opciones: [{ texto: "Retirarse", efecto: { adiosSeleccion: true, texto: "" } }],
      },
    };
    e = elegirOpcion(e, 0);
    expect(e.adiosSeleccion).toBe(true);
    expect(e.historial.at(-1)!.seleccion).toBeUndefined();
    e = decidir(pasarAOfertas(e), { tipo: "seguir" });
    e = elegirOpcion(e, 0);
    expect(e.historial.at(-1)!.seleccion).toBeUndefined();
  });
});

describe("cantera", () => {
  it("el Barça Atlètic sube al primer equipo en casi todas las carreras (30-oct)", () => {
    let subidas = 0;
    for (let s = 1; s <= 40; s++) {
      let e = crearCarrera({ nombre: "", nacion: "es", posicion: "MED", clubId: 712, semilla: s });
      for (let i = 0; i < 40 && e.fase !== "fin" && e.clubId === 712; i++) {
        if (e.fase === "escenario") e = elegirOpcion(e, 0);
        else if (e.fase === "resultado") e = pasarAOfertas(e);
        else if (e.ofertas.includes(529)) {
          subidas++;
          break;
        } else e = e.sinRenovar ? decidir(e, { tipo: "fichar", clubId: e.ofertas[0] }) : decidir(e, { tipo: "seguir" });
      }
    }
    expect(subidas).toBeGreaterThanOrEqual(32);
  });
});

describe("edad de inicio (30-oct)", () => {
  it("con 15 años, menos media; las de antes (sin edad) siguen a los 17", () => {
    const e = crearCarrera({ nombre: "", nacion: "es", posicion: "MED", clubId: 534, semilla: 7, edad: 15 });
    expect(e.edad).toBe(15);
    expect(e.media).toBeGreaterThanOrEqual(52);
    expect(e.media).toBeLessThanOrEqual(57);
    expect(crearCarrera({ nombre: "", nacion: "es", posicion: "MED", clubId: 534, semilla: 7 }).edad).toBe(17);
    expect(crearCarrera({ nombre: "", nacion: "es", posicion: "MED", clubId: 534, semilla: 7, edad: 12 }).edad).toBe(17);
  });

  it("el servidor rechaza una edad que no se puede elegir", () => {
    const inicio = { nombre: "", nacion: "es", posicion: "MED" as const, clubId: 534, semilla: 7, extendido: false };
    expect(reproducir({ ...inicio, edad: 14 }, [])).toBeNull();
  });
});
