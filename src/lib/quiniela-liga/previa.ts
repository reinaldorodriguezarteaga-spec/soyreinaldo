/**
 * Previa automática de un partido de la quiniela: unas frases redactadas con
 * nuestros datos (forma, último cara a cara, lo que pronostica la comunidad y
 * si Reinaldo ya ha pronosticado). Aporta texto propio a cada ficha —bueno
 * para Google— y ayuda a decidir el pronóstico. Sin datos, no dice nada:
 * mejor callar que inventar.
 */
import type { FormaEquipo, ResultadoCorto } from "./forma";

export type DatosPrevia = {
  local: string;
  visitante: string;
  formaLocal: FormaEquipo | null;
  formaVisitante: FormaEquipo | null;
  caraACara: {
    fecha: string;
    local: string;
    visitante: string;
    golesLocal: number;
    golesVisitante: number;
  } | null;
  /** Reparto de pronósticos (solo si hay suficientes). */
  comunidad: { total: number; local: number; empate: number; visitante: number } | null;
  /** null: no aplica (es él quien mira o no hay dato). */
  anfitrionHecho: boolean | null;
  anfitrionNombre: string;
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function resumenRacha(racha: ResultadoCorto[]): string | null {
  const n = racha.length;
  if (n === 0) return null;
  // Racha viva: los últimos iguales seguidos (si son 3 o más, es noticia).
  let seguidos = 1;
  while (seguidos < n && racha[n - 1 - seguidos] === racha[n - 1]) seguidos++;
  if (seguidos >= 3) {
    const [uno, varios, seguidas] = {
      V: ["victoria", "victorias", "seguidas"],
      E: ["empate", "empates", "seguidos"],
      D: ["derrota", "derrotas", "seguidas"],
    }[racha[n - 1]];
    return `encadena ${plural(seguidos, uno, varios)} ${seguidas}`;
  }
  const v = racha.filter((r) => r === "V").length;
  const e = racha.filter((r) => r === "E").length;
  const d = racha.filter((r) => r === "D").length;
  const partes = [
    v ? plural(v, "victoria", "victorias") : null,
    e ? plural(e, "empate", "empates") : null,
    d ? plural(d, "derrota", "derrotas") : null,
  ].filter(Boolean) as string[];
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
  return `suma ${lista} en ${n === 1 ? "su último partido" : `sus últimos ${n}`}`;
}

function fraseEquipo(nombre: string, f: FormaEquipo | null): string | null {
  if (!f) return null;
  const racha = resumenRacha(f.racha);
  const dg =
    f.dg == null
      ? ""
      : f.dg === 0
        ? " (sin diferencia de goles)"
        : ` (${f.dg > 0 ? "+" : ""}${f.dg} de diferencia de goles)`;
  if (f.puesto != null && racha) return `${nombre} llega ${f.puesto}º${dg} y ${racha}.`;
  if (f.puesto != null) return `${nombre} llega ${f.puesto}º${dg}.`;
  if (racha) return `${nombre} ${racha}.`;
  return null;
}

export function textoPrevia(d: DatosPrevia): string[] {
  const frases: string[] = [];
  const fl = fraseEquipo(d.local, d.formaLocal);
  const fv = fraseEquipo(d.visitante, d.formaVisitante);
  if (fl) frases.push(fl);
  if (fv) frases.push(fv);

  if (d.caraACara) {
    const c = d.caraACara;
    const fecha = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(
      new Date(c.fecha),
    );
    frases.push(
      `El último cara a cara, en ${fecha}, terminó ${c.local} ${c.golesLocal}–${c.golesVisitante} ${c.visitante}.`,
    );
  }

  if (d.comunidad && d.comunidad.total > 0) {
    const c = d.comunidad;
    const pct = (n: number) => Math.round((n / c.total) * 100);
    const max = Math.max(c.local, c.empate, c.visitante);
    const empatados = [c.local, c.empate, c.visitante].filter((x) => x === max).length > 1;
    if (empatados) {
      frases.push(`En la quiniela, la comunidad está dividida (${plural(c.total, "pronóstico", "pronósticos")}).`);
    } else if (max === c.empate) {
      frases.push(`En la quiniela, el ${pct(c.empate)}% de la comunidad ve empate.`);
    } else {
      const fav = max === c.local ? d.local : d.visitante;
      frases.push(`En la quiniela, el ${pct(max)}% de la comunidad da ganador a ${fav}.`);
    }
  }

  if (d.anfitrionHecho === true) {
    frases.push(`${d.anfitrionNombre} ya ha dejado su pronóstico: ¿le ganas?`);
  }
  return frases;
}
