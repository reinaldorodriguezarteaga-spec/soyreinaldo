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

/**
 * Párrafos de la crónica (15-oct: antes era un bloque con todos los datos
 * seguidos y no se entendía). 1) titular según lo que pasó: remontada,
 * goleada, gol decisivo al final, victoria o empate; 2) los goles con el
 * marcador de cada momento y los dobletes; 3) el juego en lenguaje llano:
 * balón, tiros y peligro (xG); 4) expulsiones y el mejor.
 */
export function textoCronica(d: DatosCronica): string[] {
  const parrafos: string[] = [];
  const nombre = (id: number) => (id === d.local.id ? d.local.nombre : d.visitante.nombre);
  const donde = d.ronda
    ? /^jornada/i.test(d.ronda)
      ? `en la ${d.ronda.toLowerCase()} de ${d.competicion}`
      : `en ${d.competicion} (${d.ronda})`
    : `en ${d.competicion}`;
  const { golesLocal: gl, golesVisitante: gv } = d;
  const ordenados = d.goles.slice().sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0));
  const min = (m: number | null) => (m != null ? `${m}'` : "");

  // Evolución del marcador: ¿quién ganaba en cada momento?
  let h = 0;
  let a = 0;
  let ganadorIba = { perdiendo: false };
  const ganadorId = gl > gv ? d.local.id : gv > gl ? d.visitante.id : null;
  const marcadores = ordenados.map((g) => {
    if (g.equipoId === d.local.id) h++;
    else a++;
    if (ganadorId === d.local.id && h < a) ganadorIba = { perdiendo: true };
    if (ganadorId === d.visitante.id && a < h) ganadorIba = { perdiendo: true };
    return { g, marcador: `${h}-${a}` };
  });
  // Gol decisivo: el que puso por delante al ganador para no volver a perder
  // la ventaja; si es del minuto 85 en adelante, es "en el tramo final".
  let decisivo: GolCronica | null = null;
  if (ganadorId != null) {
    let hh = 0;
    let aa = 0;
    for (const g of ordenados) {
      const antes = ganadorId === d.local.id ? hh - aa : aa - hh;
      if (g.equipoId === d.local.id) hh++;
      else aa++;
      const despues = ganadorId === d.local.id ? hh - aa : aa - hh;
      if (antes <= 0 && despues > 0 && g.equipoId === ganadorId) decisivo = g;
    }
  }

  // 1. Titular.
  const ganador = ganadorId != null ? nombre(ganadorId) : null;
  const perdedor = ganadorId === d.local.id ? d.visitante.nombre : d.local.nombre;
  const fuera = ganadorId === d.visitante.id;
  const resultado = `${gl}-${gv}`;
  let titular: string;
  if (ganador == null) {
    titular = `${d.local.nombre} y ${d.visitante.nombre} empataron ${resultado} ${donde}.`;
  } else if (ganadorIba.perdiendo) {
    titular = fuera
      ? `${ganador} remontó y ganó ${resultado} en su visita a ${perdedor} ${donde}.`
      : `${ganador} remontó y ganó ${resultado} a ${perdedor} ${donde}.`;
  } else if (Math.abs(gl - gv) >= 3) {
    titular = `${ganador} goleó ${fuera ? `${resultado} a domicilio` : resultado} a ${perdedor} ${donde}.`;
  } else {
    titular = fuera
      ? `${ganador} ganó ${resultado} en su visita a ${perdedor} ${donde}.`
      : `${ganador} venció ${resultado} a ${perdedor} ${donde}.`;
  }
  if (decisivo && (decisivo.minuto ?? 0) >= 85 && ordenados.length > 1) {
    titular = titular.replace(/\.$/, `, con el gol decisivo de ${decisivo.jugador} en el ${min(decisivo.minuto)}.`);
  }
  parrafos.push(titular);

  // 2. Los goles, con el marcador de cada momento.
  if (ordenados.length === 0) {
    if (gl + gv === 0) parrafos.push("No hubo goles.");
  } else {
    const etiqueta = (g: GolCronica) =>
      g.tipo === "Penalty" ? ", de penalti" : g.tipo === "Own Goal" ? ", en propia puerta" : "";
    const lineas = marcadores.map(
      ({ g, marcador }) => `${marcador} ${g.jugador} (${min(g.minuto)}${etiqueta(g)})`,
    );
    let texto = `Los goles: ${lista(lineas)}.`;
    // Dobletes y tripletes (sin contar autogoles).
    const cuenta = new Map<string, number>();
    for (const g of ordenados) {
      if (g.tipo === "Own Goal") continue;
      cuenta.set(g.jugador, (cuenta.get(g.jugador) ?? 0) + 1);
    }
    const hazana = (n: number) => (n === 2 ? "un doblete" : n === 3 ? "un triplete" : `${n} goles`);
    const destacados = [...cuenta.entries()].filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1]);
    if (destacados.length) {
      const [primero, ...resto] = destacados;
      const otros = resto.map(([j, n]) => `${j}, ${hazana(n)}`);
      texto += ` ${primero[0]} firmó ${hazana(primero[1])}${otros.length ? ` y ${lista(otros)}` : ""}.`;
    }
    parrafos.push(texto);
  }

  // 3. El juego, en llano: balón, tiros y peligro. Cada dato con su equipo;
  // al redactar se agrupan para no repetir el nombre.
  const juego: { equipo: string; texto: string }[] = [];
  if (d.posesion) {
    const [ph, pa] = d.posesion;
    if (ph !== pa) juego.push({ equipo: ph > pa ? d.local.nombre : d.visitante.nombre, texto: `tuvo más el balón (${Math.max(ph, pa)}%)` });
  }
  if (d.tiros) {
    const [th, ta] = d.tiros;
    const pt = d.tirosPuerta;
    if (th !== ta) {
      const masTiro = th > ta ? 0 : 1;
      const puerta = pt ? `, ${pt[masTiro]} a puerta por ${pt[1 - masTiro]}` : "";
      juego.push({
        equipo: masTiro === 0 ? d.local.nombre : d.visitante.nombre,
        texto: `tiró más (${Math.max(th, ta)} por ${Math.min(th, ta)}${puerta})`,
      });
    }
  }
  if (d.xg) {
    const [xh, xa] = d.xg;
    if (Math.abs(xh - xa) >= 0.05) {
      const mas = xh > xa ? 0 : 1;
      juego.push({
        equipo: mas === 0 ? d.local.nombre : d.visitante.nombre,
        texto: `generó más peligro (${coma(d.xg[mas], 2)} de xG por ${coma(d.xg[1 - mas], 2)})`,
      });
    }
  }
  if (juego.length) {
    // Tramos seguidos del mismo equipo: "X tuvo… y tiró…, pero Y generó…".
    const tramos: { equipo: string; textos: string[] }[] = [];
    for (const j of juego) {
      const ult = tramos.at(-1);
      if (ult && ult.equipo === j.equipo) ult.textos.push(j.texto);
      else tramos.push({ equipo: j.equipo, textos: [j.texto] });
    }
    if (tramos.length === 1 && juego.length === 3) {
      parrafos.push(`${tramos[0].equipo} dominó: ${lista(tramos[0].textos)}.`);
    } else {
      parrafos.push(`${tramos.map((t) => `${t.equipo} ${lista(t.textos)}`).join(", pero ")}.`);
    }
  }

  // 4. Expulsiones y el mejor.
  const cierre: string[] = [];
  for (const e of d.expulsiones) {
    cierre.push(`${e.jugador} (${nombre(e.equipoId)}) fue expulsado${e.minuto != null ? ` en el ${min(e.minuto)}` : ""}.`);
  }
  if (d.mejor) {
    cierre.push(`El mejor del partido, según las notas: ${d.mejor.nombre} (${nombre(d.mejor.equipoId)}), con un ${coma(d.mejor.nota)}.`);
  }
  if (cierre.length) parrafos.push(cierre.join(" "));
  return parrafos;
}
