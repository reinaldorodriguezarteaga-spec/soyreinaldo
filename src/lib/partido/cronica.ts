/**
 * Crónica automática de un partido terminado (13-oct-2026): unas frases con
 * el resultado, los goles, el dominio (posesión, tiros, xG), las
 * expulsiones y el mejor valorado. Todo sale de lo que la ficha ya tiene
 * cargado: no gasta llamadas. Aporta texto propio a cada partido (Google,
 * AdSense). Sin un dato, se calla esa frase: mejor callar que inventar.
 *
 * Sin artículos delante de los equipos ("Barcelona venció a Getafe"): con
 * selecciones y nombres raros, "el España" o "el Lens" sonarían mal.
 */

export type GolCronica = {
  minuto: number | null;
  /** El equipo que se BENEFICIA del gol (en un autogol, el rival del que lo
   * marca; ojo, el API lo pone al revés). */
  equipoId: number;
  jugador: string;
  /** "Normal Goal" | "Penalty" | "Own Goal" */
  tipo: string;
};

export type DatosCronica = {
  competicion: string;
  /** "Jornada 8", "Round of 16"… o null. */
  ronda: string | null;
  local: { id: number; nombre: string };
  visitante: { id: number; nombre: string };
  golesLocal: number;
  golesVisitante: number;
  goles: GolCronica[];
  expulsiones: { minuto: number | null; equipoId: number; jugador: string }[];
  /** [local, visitante] */
  posesion: [number, number] | null;
  tiros: [number, number] | null;
  tirosPuerta: [number, number] | null;
  xg: [number, number] | null;
  mejor: { nombre: string; equipoId: number; nota: number } | null;
};

const coma = (n: number, dec = 1) => n.toFixed(dec).replace(".", ",");

function lista(partes: string[]): string {
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0] ?? "";
}

export function textoCronica(d: DatosCronica): string[] {
  const frases: string[] = [];
  const nombre = (id: number) => (id === d.local.id ? d.local.nombre : d.visitante.nombre);
  const donde = d.ronda
    ? /^jornada/i.test(d.ronda)
      ? `en la ${d.ronda.toLowerCase()} de ${d.competicion}`
      : `en ${d.competicion} (${d.ronda})`
    : `en ${d.competicion}`;

  // 1. Resultado.
  const { golesLocal: gl, golesVisitante: gv } = d;
  if (gl > gv) {
    frases.push(`${d.local.nombre} venció ${gl}-${gv} a ${d.visitante.nombre} ${donde}.`);
  } else if (gv > gl) {
    frases.push(`${d.visitante.nombre} ganó ${gl}-${gv} en su visita a ${d.local.nombre} ${donde}.`);
  } else {
    frases.push(`${d.local.nombre} y ${d.visitante.nombre} empataron ${gl}-${gv} ${donde}.`);
  }

  // 2. Goles, por equipo y en orden.
  if (d.goles.length === 0) {
    if (gl + gv === 0) frases.push("No hubo goles.");
  } else {
    const ordenados = d.goles.slice().sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0));
    const porEquipo = (id: number) =>
      ordenados
        .filter((g) => g.equipoId === id)
        .map((g) => {
          const min = g.minuto != null ? `${g.minuto}'` : "";
          const extra = g.tipo === "Penalty" ? ", de penalti" : g.tipo === "Own Goal" ? ", en propia puerta" : "";
          return `${g.jugador}${min || extra ? ` (${min}${extra})` : ""}`;
        });
    const tramos = [d.local, d.visitante]
      .map((t) => ({ t, goles: porEquipo(t.id) }))
      .filter((x) => x.goles.length > 0)
      .map((x) => `por ${x.t.nombre}, ${lista(x.goles)}`);
    if (tramos.length) {
      const texto = tramos.join("; ");
      frases.push(`Marcaron ${texto}.`);
    }
  }

  // 3. Dominio.
  if (d.posesion && d.tiros) {
    const [ph, pa] = d.posesion;
    const domina = ph >= pa ? 0 : 1;
    const eq = domina === 0 ? d.local.nombre : d.visitante.nombre;
    const t = d.tiros[domina];
    const tr = d.tiros[1 - domina];
    const tp = d.tirosPuerta?.[domina];
    const tpr = d.tirosPuerta?.[1 - domina];
    const puerta = tp != null && tpr != null ? ` (${tp} a puerta, por ${tpr} del rival)` : "";
    frases.push(
      `${eq} tuvo el ${Math.max(ph, pa)}% de la posesión y disparó ${t} veces frente a ${tr}${puerta}.`,
    );
  }
  if (d.xg) {
    frases.push(
      `En goles esperados (xG), ${coma(d.xg[0], 2)} para ${d.local.nombre} y ${coma(d.xg[1], 2)} para ${d.visitante.nombre}.`,
    );
  }

  // 4. Expulsiones.
  for (const e of d.expulsiones) {
    frases.push(
      `${e.jugador} (${nombre(e.equipoId)}) fue expulsado${e.minuto != null ? ` en el minuto ${e.minuto}` : ""}.`,
    );
  }

  // 5. El mejor.
  if (d.mejor) {
    frases.push(
      `El mejor valorado fue ${d.mejor.nombre} (${nombre(d.mejor.equipoId)}), con un ${coma(d.mejor.nota)}.`,
    );
  }
  return frases;
}
