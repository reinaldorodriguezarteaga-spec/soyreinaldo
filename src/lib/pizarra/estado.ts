import { FORMACION_INICIAL, FORMACIONES, type Lado } from "./formaciones";

/**
 * Estado completo de la pizarra y su paso a/desde la URL (fase 2, 20-oct):
 * el enlace compartido lleva la pizarra entera en `?p=`, sin guardar nada en
 * la base de datos. Todo lo que viene de la URL se valida: formaciones de la
 * lista, jugadores de las plantillas y coordenadas dentro del campo.
 */

export type Punto = { x: number; y: number };
export type TipoFlecha = "pase" | "carrera";
export type Flecha = { a: Punto; b: Punto; tipo: TipoFlecha };
export type PorLado<T> = Record<Lado, T>;
/** Una etapa de la animación: dónde está cada jugador ("l:154" / "v:874",
 * por id, así sigue valiendo si se cambian huecos), el balón y las flechas. */
export type Etapa = { jug: Record<string, Punto>; balon: Punto | null; flechas: Flecha[] };
/** Zona sombreada (rectángulo entre dos esquinas) y texto suelto en el campo. */
export type Zona = { a: Punto; b: Punto; color: string };
export type Texto = { p: Punto; t: string };

/** Colores para equipaciones y zonas (los únicos que acepta la URL). */
export const PALETA = [
  "#3b82f6", // azul
  "#ff5b8a", // rosa
  "#ef4444", // rojo
  "#a50044", // granate
  "#f59e0b", // naranja
  "#facc15", // amarillo
  "#22c55e", // verde
  "#0ea5e9", // celeste
  "#8b5cf6", // morado
  "#ffffff", // blanco
  "#111827", // negro
] as const;
export const COLOR_INICIAL: PorLado<string> = { local: "#3b82f6", visitante: "#ff5b8a" };
const MAX_ZONAS = 20;
const MAX_TEXTOS = 20;
export const MAX_LARGO_TEXTO = 60;
export type Estado = {
  formacion: PorLado<string>;
  once: PorLado<(number | null)[]>;
  /** Posición movida a mano de cada hueco ("local:3"). */
  movidos: Record<string, Punto>;
  flechas: Flecha[];
  balon: Punto | null;
  etapas: Etapa[];
  zonas: Zona[];
  textos: Texto[];
  /** Jugadores destacados ("l:154"). */
  focos: string[];
  colores: PorLado<string>;
};

const MAX_FLECHAS = 40;
export const MAX_ETAPAS = 10;
/** Con 10 etapas el enlace ronda los 6-7 KB: cabe en WhatsApp y en la barra. */
const MAX_URL = 12000;

export const vacio = (): (number | null)[] => Array(11).fill(null);
export const estadoInicial = (): Estado => ({
  formacion: { local: FORMACION_INICIAL, visitante: FORMACION_INICIAL },
  once: { local: vacio(), visitante: vacio() },
  movidos: {},
  flechas: [],
  balon: null,
  etapas: [],
  zonas: [],
  textos: [],
  focos: [],
  colores: { ...COLOR_INICIAL },
});

/** Coordenada a entero 0..1000 y vuelta (URLs más cortas). */
const aMil = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000);
const deMil = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v / 1000)) : null;

const LETRA: PorLado<string> = { local: "l", visitante: "v" };

const flechaACompacta = (f: Flecha) => [aMil(f.a.x), aMil(f.a.y), aMil(f.b.x), aMil(f.b.y), f.tipo === "carrera" ? 1 : 0];

function leerPunto(v: unknown): Punto | null {
  if (!Array.isArray(v)) return null;
  const x = deMil(v[0]);
  const y = deMil(v[1]);
  return x == null || y == null ? null : { x, y };
}

function leerFlechas(v: unknown): Flecha[] {
  if (!Array.isArray(v)) return [];
  const out: Flecha[] = [];
  for (const a of v.slice(0, MAX_FLECHAS)) {
    if (!Array.isArray(a)) continue;
    const ini = leerPunto([a[0], a[1]]);
    const fin = leerPunto([a[2], a[3]]);
    if (ini && fin) out.push({ a: ini, b: fin, tipo: a[4] === 1 ? "carrera" : "pase" });
  }
  return out;
}

export function codificar(e: Estado): string {
  const compacto = {
    f: [e.formacion.local, e.formacion.visitante],
    o: [e.once.local.map((x) => x ?? 0), e.once.visitante.map((x) => x ?? 0)],
    m: Object.fromEntries(
      Object.entries(e.movidos).map(([k, p]) => {
        const [lado, i] = k.split(":");
        return [`${LETRA[lado as Lado]}${i}`, [aMil(p.x), aMil(p.y)]];
      }),
    ),
    a: e.flechas.map(flechaACompacta),
    b: e.balon ? [aMil(e.balon.x), aMil(e.balon.y)] : 0,
    z: e.zonas.map((z) => [aMil(z.a.x), aMil(z.a.y), aMil(z.b.x), aMil(z.b.y), PALETA.indexOf(z.color as (typeof PALETA)[number])]),
    t: e.textos.map((t) => [aMil(t.p.x), aMil(t.p.y), t.t]),
    k: e.focos,
    c: [PALETA.indexOf(e.colores.local as (typeof PALETA)[number]), PALETA.indexOf(e.colores.visitante as (typeof PALETA)[number])],
    e: e.etapas.map((et) => [
      Object.entries(et.jug).map(([k, p]) => [k, aMil(p.x), aMil(p.y)]),
      et.balon ? [aMil(et.balon.x), aMil(et.balon.y)] : 0,
      et.flechas.map(flechaACompacta),
    ]),
  };
  return btoa(JSON.stringify(compacto)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** El estado de un `?p=`, o null si no vale. Los jugadores que no estén en
 * la plantilla de su equipo se descartan (hueco vacío). */
export function decodificar(p: string | undefined | null, plantillas: PorLado<number[]>): Estado | null {
  if (!p || p.length > MAX_URL) return null;
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
  if (!d || typeof d !== "object") return null;
  const e = estadoInicial();

  const f = Array.isArray(d.f) ? d.f : [];
  (["local", "visitante"] as Lado[]).forEach((lado, n) => {
    if (typeof f[n] === "string" && FORMACIONES.includes(f[n])) e.formacion[lado] = f[n];
  });

  const o = Array.isArray(d.o) ? d.o : [];
  (["local", "visitante"] as Lado[]).forEach((lado, n) => {
    const fila = Array.isArray(o[n]) ? o[n] : [];
    const validos = new Set(plantillas[lado]);
    const usados = new Set<number>();
    e.once[lado] = vacio().map((_, i) => {
      const id = fila[i];
      if (typeof id !== "number" || !validos.has(id) || usados.has(id)) return null;
      usados.add(id);
      return id;
    });
  });

  if (d.m && typeof d.m === "object") {
    for (const [k, v] of Object.entries(d.m as Record<string, unknown>)) {
      const m = /^([lv])(\d{1,2})$/.exec(k);
      if (!m || Number(m[2]) > 10 || !Array.isArray(v)) continue;
      const x = deMil(v[0]);
      const y = deMil(v[1]);
      if (x == null || y == null) continue;
      e.movidos[`${m[1] === "l" ? "local" : "visitante"}:${Number(m[2])}`] = { x, y };
    }
  }

  e.flechas = leerFlechas(d.a);
  e.balon = leerPunto(d.b);

  const validos: Record<string, Set<number>> = { l: new Set(plantillas.local), v: new Set(plantillas.visitante) };
  const claveValida = (k: unknown): k is string => {
    const m = typeof k === "string" ? /^([lv]):(\d{1,9})$/.exec(k) : null;
    return !!m && validos[m[1]].has(Number(m[2]));
  };

  if (Array.isArray(d.z)) {
    for (const z of d.z.slice(0, MAX_ZONAS)) {
      if (!Array.isArray(z)) continue;
      const a = leerPunto([z[0], z[1]]);
      const b = leerPunto([z[2], z[3]]);
      const color = PALETA[typeof z[4] === "number" ? z[4] : -1];
      if (a && b && color) e.zonas.push({ a, b, color });
    }
  }
  if (Array.isArray(d.t)) {
    for (const t of d.t.slice(0, MAX_TEXTOS)) {
      if (!Array.isArray(t) || typeof t[2] !== "string") continue;
      const p = leerPunto([t[0], t[1]]);
      const texto = t[2].trim().slice(0, MAX_LARGO_TEXTO);
      if (p && texto) e.textos.push({ p, t: texto });
    }
  }
  if (Array.isArray(d.k)) e.focos = [...new Set(d.k.filter(claveValida))].slice(0, 22);
  if (Array.isArray(d.c)) {
    (["local", "visitante"] as Lado[]).forEach((lado, n) => {
      const color = PALETA[typeof d.c === "object" && Array.isArray(d.c) && typeof d.c[n] === "number" ? d.c[n] : -1];
      if (color) e.colores[lado] = color;
    });
  }

  if (Array.isArray(d.e)) {
    for (const et of d.e.slice(0, MAX_ETAPAS)) {
      if (!Array.isArray(et)) continue;
      const jug: Record<string, Punto> = {};
      for (const j of Array.isArray(et[0]) ? et[0] : []) {
        if (!Array.isArray(j) || typeof j[0] !== "string") continue;
        const p = leerPunto([j[1], j[2]]);
        if (p && claveValida(j[0])) jug[j[0]] = p;
      }
      e.etapas.push({ jug, balon: leerPunto(et[1]), flechas: leerFlechas(et[2]) });
    }
  }
  return e;
}
