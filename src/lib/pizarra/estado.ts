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
export type Estado = {
  formacion: PorLado<string>;
  once: PorLado<(number | null)[]>;
  /** Posición movida a mano de cada hueco ("local:3"). */
  movidos: Record<string, Punto>;
  flechas: Flecha[];
  balon: Punto | null;
};

const MAX_FLECHAS = 40;
const MAX_URL = 4000;

export const vacio = (): (number | null)[] => Array(11).fill(null);
export const estadoInicial = (): Estado => ({
  formacion: { local: FORMACION_INICIAL, visitante: FORMACION_INICIAL },
  once: { local: vacio(), visitante: vacio() },
  movidos: {},
  flechas: [],
  balon: null,
});

/** Coordenada a entero 0..1000 y vuelta (URLs más cortas). */
const aMil = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000);
const deMil = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v / 1000)) : null;

const LETRA: PorLado<string> = { local: "l", visitante: "v" };

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
    a: e.flechas.map((f) => [aMil(f.a.x), aMil(f.a.y), aMil(f.b.x), aMil(f.b.y), f.tipo === "carrera" ? 1 : 0]),
    b: e.balon ? [aMil(e.balon.x), aMil(e.balon.y)] : 0,
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

  if (Array.isArray(d.a)) {
    for (const a of d.a.slice(0, MAX_FLECHAS)) {
      if (!Array.isArray(a)) continue;
      const [ax, ay, bx, by] = [deMil(a[0]), deMil(a[1]), deMil(a[2]), deMil(a[3])];
      if (ax == null || ay == null || bx == null || by == null) continue;
      e.flechas.push({ a: { x: ax, y: ay }, b: { x: bx, y: by }, tipo: a[4] === 1 ? "carrera" : "pase" });
    }
  }

  if (Array.isArray(d.b)) {
    const x = deMil(d.b[0]);
    const y = deMil(d.b[1]);
    if (x != null && y != null) e.balon = { x, y };
  }
  return e;
}
