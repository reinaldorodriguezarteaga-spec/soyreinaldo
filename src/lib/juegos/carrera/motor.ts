import { aleatorio } from "../diario";
import { CLUBES_CARRERA, NIVEL_ESCALON, clubPorId, nacionPorCodigo, type ClubCarrera, type Escalon } from "./clubes";

/**
 * Modo carrera (27-oct, pedido del dueño): de los 17 años en un equipo de
 * segunda hasta la retirada. Cada año, un escenario con opciones que suben,
 * bajan o mantienen la media; luego la temporada (partidos, goles,
 * asistencias, trofeos, premios) y las ofertas, que dependen SOLO del
 * rendimiento. Desde los 34 se pregunta si retirarse; a los 41, se acabó.
 *
 * Todo puro y con semilla: el estado se guarda en el navegador y recargar
 * no cambia lo que ya salió.
 */

export type Posicion = "POR" | "DEF" | "MED" | "DEL";
export const NOMBRE_POSICION: Record<Posicion, string> = { POR: "Portero", DEF: "Defensa", MED: "Centrocampista", DEL: "Delantero" };

export const EDAD_INICIO = 17;
export const EDAD_PREGUNTA_RETIRO = 34;
export const EDAD_RETIRO = 41;
export const ANIO_INICIO = 2026;

type Rango = [number, number];
export type Efecto = {
  /** Cambio de media al elegir (antes de jugar la temporada). */
  media?: Rango;
  /** Multiplica los minutos. */
  minutos?: number;
  /** Multiplica los goles (lanzador de penaltis…). */
  goles?: number;
  /** Probabilidad de lesionarse esta temporada. */
  lesion?: number;
  /** La temporada se juega cedido en un club de un escalón menos. */
  cedido?: boolean;
  /** Multiplica el declive por edad (cuidarse lo frena). */
  declive?: number;
  /** Suma a la nota de la temporada. */
  nota?: number;
  /** Lo que puede salir mal: con probabilidad p, otra media y otro texto. */
  riesgo?: { p: number; media: Rango; texto: string };
  /** Cómo sale si va bien. */
  texto: string;
};
export type Opcion = { texto: string; efecto: Efecto };
export type Escenario = { id: string; titulo: string; texto: string; opciones: Opcion[] };

export type Temporada = {
  anio: number;
  edad: number;
  clubId: number;
  /** Si jugó cedido, el club donde jugó. */
  cedidoEn?: number;
  mediaInicio: number;
  media: number;
  partidos: number;
  goles: number;
  asistencias: number;
  porteriasCero: number;
  nota: number | null;
  trofeos: string[];
  premios: string[];
  seleccion?: { partidos: number; goles: number };
  eleccion: string;
  resultadoEleccion: string;
  lesionado: boolean;
};

export type Estado = {
  v: 1;
  semilla: number;
  paso: number;
  nombre: string;
  nacion: string;
  posicion: Posicion;
  edad: number;
  anio: number;
  clubId: number;
  /** Escalón actual del club (un ascenso lo sube a primera). */
  escalonClub: Escalon;
  media: number;
  potencial: number;
  fase: "escenario" | "resultado" | "ofertas" | "fin";
  escenario: Escenario | null;
  ultimoEscenario: string | null;
  ofertas: number[];
  /** El club no te renueva: no hay «seguir». */
  sinRenovar?: boolean;
  historial: Temporada[];
};

// ── Azar con semilla ──
function rng(e: Estado): () => number {
  const r = aleatorio(e.semilla * 7919 + e.paso * 104729);
  r();
  r();
  return r;
}
const entre = (r: () => number, [a, b]: Rango) => a + Math.round(r() * (b - a));
const elegirDe = <T,>(r: () => number, lista: T[]) => lista[Math.floor(r() * lista.length)];
const limitar = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export const temporadaTexto = (anio: number) => `${anio}-${String((anio + 1) % 100).padStart(2, "0")}`;

// ── Escenarios ──
type Generador = { id: string; peso: number; vale: (e: Estado) => boolean; crea: (e: Estado) => Escenario };
const nivel = (e: Estado) => NIVEL_ESCALON[e.escalonClub];

const ESCENARIOS: Generador[] = [
  {
    id: "verano",
    peso: 3,
    vale: (e) => e.edad < 31,
    crea: () => ({
      id: "verano",
      titulo: "Verano",
      texto: "Acaba la temporada y tienes un mes libre. ¿Qué haces?",
      opciones: [
        { texto: "Entrenar todo el verano con un preparador", efecto: { media: [1, 3], lesion: 0.08, texto: "Llegas como un avión a la pretemporada." } },
        { texto: "Descansar y desconectar", efecto: { media: [0, 1], texto: "Vuelves fresco y con la cabeza despejada." } },
        {
          texto: "Fiesta en Ibiza con los amigos",
          efecto: { media: [-1, 0], texto: "Lo pasaste en grande y volviste con un par de kilos de más.", riesgo: { p: 0.3, media: [-3, -2], texto: "Te pillan de fiesta en redes y el club te abre expediente." } },
        },
      ],
    }),
  },
  {
    id: "suplente",
    peso: 5,
    vale: (e) => e.media < nivel(e) - 2 && e.escalonClub < 5,
    crea: () => ({
      id: "suplente",
      titulo: "Al banquillo",
      texto: "El míster te ve por detrás de los titulares. Te llama a su despacho.",
      opciones: [
        { texto: "Pelear el puesto en cada entrenamiento", efecto: { media: [0, 2], texto: "No te rindes y el míster lo nota." } },
        { texto: "Pedir una cesión para jugar", efecto: { cedido: true, media: [1, 2], minutos: 1.3, texto: "Te vas cedido a jugar todos los domingos." } },
        { texto: "Aceptar el banquillo y aprender", efecto: { media: [0, 1], minutos: 0.6, texto: "Aprendes mucho de los veteranos, pero juegas poco." } },
      ],
    }),
  },
  {
    id: "lesion",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "lesion",
      titulo: "Lesión",
      texto: "Te rompes en pretemporada: rotura muscular de las feas.",
      opciones: [
        { texto: "Recuperación completa, sin prisas", efecto: { minutos: 0.7, media: [0, 0], texto: "Te pierdes unos meses, pero vuelves al cien por cien." } },
        {
          texto: "Infiltrarte y volver cuanto antes",
          efecto: { minutos: 1, media: [0, 0], texto: "Vuelves rápido y aguantas.", riesgo: { p: 0.4, media: [-4, -2], texto: "Recaes y la lesión se cronifica." } },
        },
      ],
    }),
  },
  {
    id: "mentor",
    peso: 3,
    vale: (e) => e.edad <= 22,
    crea: () => ({
      id: "mentor",
      titulo: "Un veterano",
      texto: "El capitán del vestuario se ofrece a apadrinarte: entrenamientos extra, vídeos, consejos.",
      opciones: [
        { texto: "Aceptar y ser su sombra", efecto: { media: [1, 3], texto: "Aprendes a leer los partidos como un veterano." } },
        { texto: "Ir por libre, a tu manera", efecto: { media: [0, 1], texto: "Sigues con lo tuyo." } },
      ],
    }),
  },
  {
    id: "seleccion",
    peso: 3,
    vale: (e) => e.media >= umbralSeleccion(e) - 2 && e.edad >= 18,
    crea: (e) => ({
      id: "seleccion",
      titulo: "La selección",
      texto: `El seleccionador de ${nacionPorCodigo(e.nacion).nombre} te quiere en la próxima convocatoria.`,
      opciones: [
        { texto: "Ir encantado, es un sueño", efecto: { media: [0, 2], lesion: 0.06, texto: "Debutas con la absoluta y vuelves con la moral por las nubes." } },
        { texto: "Pedir no ir para centrarte en el club", efecto: { media: [0, 1], nota: 0.2, texto: "Te centras en el club y se nota." } },
      ],
    }),
  },
  {
    id: "entrenador",
    peso: 3,
    vale: () => true,
    crea: () => ({
      id: "entrenador",
      titulo: "Nuevo entrenador",
      texto: "Llega un entrenador con un sistema que no te favorece nada.",
      opciones: [
        { texto: "Adaptarte a lo que pide", efecto: { media: [0, 2], texto: "Te reinventas y acabas siendo pieza clave." } },
        {
          texto: "Pedirle minutos cara a cara",
          efecto: { media: [0, 1], minutos: 1.15, texto: "Le convences y te da galones.", riesgo: { p: 0.35, media: [-1, 0], texto: "No le sienta bien: te manda a la grada unas semanas." } },
        },
        { texto: "Esperar tu momento sin hacer ruido", efecto: { media: [0, 0], minutos: 0.85, texto: "Esperas tu oportunidad." } },
      ],
    }),
  },
  {
    id: "marca",
    peso: 2,
    vale: (e) => e.media >= 72,
    crea: () => ({
      id: "marca",
      titulo: "Contrato publicitario",
      texto: "Una marca te ofrece un contrato millonario… con eventos cada semana.",
      opciones: [
        { texto: "Firmar: el dinero no sobra nunca", efecto: { media: [-1, 0], texto: "Más dinero, menos descanso." } },
        { texto: "Rechazarlo y centrarte en el fútbol", efecto: { media: [0, 1], texto: "Solo piensas en el balón." } },
      ],
    }),
  },
  {
    id: "redes",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "redes",
      titulo: "Polémica en redes",
      texto: "Un vídeo tuyo de hace años se hace viral y te llueven críticas.",
      opciones: [
        { texto: "Pedir perdón públicamente", efecto: { media: [0, 0], texto: "La gente lo valora y pasa página." } },
        {
          texto: "Responder a los que critican",
          efecto: { media: [0, 1], texto: "Les callas la boca en el campo.", riesgo: { p: 0.5, media: [-2, -1], texto: "Entras al trapo y te afecta en el campo." } },
        },
        { texto: "Ignorarlo y cerrar las redes", efecto: { media: [0, 1], texto: "Desconectas y te va mejor." } },
      ],
    }),
  },
  {
    id: "penaltis",
    peso: 2,
    vale: (e) => (e.posicion === "DEL" || e.posicion === "MED") && e.media >= nivel(e) - 1,
    crea: () => ({
      id: "penaltis",
      titulo: "Los penaltis",
      texto: "El míster te ofrece ser el lanzador de penaltis.",
      opciones: [
        { texto: "Aceptar: los penaltis son goles", efecto: { goles: 1.25, texto: "Te haces cargo de los penaltis." } },
        { texto: "Dejárselos al capitán", efecto: { nota: 0.1, texto: "El vestuario valora tu humildad." } },
      ],
    }),
  },
  {
    id: "portero",
    peso: 3,
    vale: (e) => e.posicion === "POR" && e.edad < 32,
    crea: () => ({
      id: "portero",
      titulo: "Juego de pies",
      texto: "El entrenador de porteros quiere que mejores con los pies para sacar el balón jugado.",
      opciones: [
        { texto: "Horas extra con el balón en los pies", efecto: { media: [1, 2], texto: "Ahora eres un líbero más." } },
        { texto: "Centrarte en lo tuyo: parar", efecto: { media: [0, 1], nota: 0.1, texto: "Paras todo lo que te llega." } },
      ],
    }),
  },
  {
    id: "capitan",
    peso: 2,
    vale: (e) => e.edad >= 26 && e.media >= nivel(e),
    crea: () => ({
      id: "capitan",
      titulo: "El brazalete",
      texto: "El club te ofrece ser el capitán.",
      opciones: [
        { texto: "Aceptar con orgullo", efecto: { nota: 0.3, media: [0, 1], texto: "Llevas el brazalete y tiras del equipo." } },
        { texto: "Rechazarlo: prefieres liderar en el campo", efecto: { media: [0, 1], texto: "Lideras con el ejemplo." } },
      ],
    }),
  },
  {
    id: "cuerpo",
    peso: 6,
    vale: (e) => e.edad >= 30,
    crea: () => ({
      id: "cuerpo",
      titulo: "El paso del tiempo",
      texto: "El cuerpo ya no responde como antes. Tu fisio te propone cambios.",
      opciones: [
        { texto: "Plan de cuidado: nutricionista, yoga y crioterapia", efecto: { declive: 0.5, texto: "Te cuidas como nunca y lo notas." } },
        { texto: "Dosificarte y jugar menos minutos", efecto: { declive: 0.7, minutos: 0.75, texto: "Juegas menos, pero llegas mejor a los partidos grandes." } },
        { texto: "Seguir como siempre", efecto: { declive: 1, texto: "Sigues a tu manera." } },
      ],
    }),
  },
  {
    id: "posicion",
    peso: 1,
    vale: (e) => e.posicion !== "POR" && e.edad <= 25,
    crea: (e) => ({
      id: "posicion",
      titulo: "Cambio de posición",
      texto: "El míster te prueba en otra posición en los entrenamientos.",
      opciones: [
        {
          texto: "Aceptar el reto",
          efecto: { media: [-1, 2], texto: "Le das una vuelta a tu juego y ganas recursos.", riesgo: { p: 0.25, media: [-2, -1], texto: "No terminas de encajar." } },
        },
        { texto: `Seguir de ${NOMBRE_POSICION[e.posicion].toLowerCase()}`, efecto: { media: [0, 1], texto: "Sigues en tu sitio." } },
      ],
    }),
  },
];

export function umbralSeleccion(e: Estado): number {
  return 74 + Math.round(nacionPorCodigo(e.nacion).fuerza * 40);
}

function generarEscenario(e: Estado): Escenario {
  const r = rng(e);
  const validos = ESCENARIOS.filter((g) => g.vale(e) && g.id !== e.ultimoEscenario);
  const total = validos.reduce((s, g) => s + g.peso, 0);
  let x = r() * total;
  for (const g of validos) {
    x -= g.peso;
    if (x <= 0) return g.crea(e);
  }
  return validos[0].crea(e);
}

// ── Crear ──
export function crearCarrera(o: { nombre: string; nacion: string; posicion: Posicion; clubId: number; semilla: number }): Estado {
  const club = clubPorId(o.clubId);
  const base: Estado = {
    v: 1,
    semilla: o.semilla,
    paso: 0,
    nombre: o.nombre.trim().slice(0, 30) || "El Crack",
    nacion: o.nacion,
    posicion: o.posicion,
    edad: EDAD_INICIO,
    anio: ANIO_INICIO,
    clubId: o.clubId,
    escalonClub: club?.escalon ?? 5,
    media: 0,
    potencial: 0,
    fase: "escenario",
    escenario: null,
    ultimoEscenario: null,
    ofertas: [],
    historial: [],
  };
  const r = rng(base);
  base.media = entre(r, [58, 63]);
  // Potencial oculto: la mayoría entre 78 y 88; unos pocos, cracks.
  base.potencial = limitar(Math.round(73 + r() * 13 + (r() < 0.2 ? r() * 9 : 0)), 70, 96);
  base.paso = 1;
  base.escenario = generarEscenario(base);
  return base;
}

// ── Temporada ──
const MAX_PARTIDOS: Record<Escalon, number> = { 1: 52, 2: 49, 3: 46, 4: 42, 5: 44 };
const COPA: Record<string, string> = {
  LaLiga: "Copa del Rey",
  "Premier League": "FA Cup",
  "Serie A": "Coppa Italia",
  Bundesliga: "DFB-Pokal",
  "Ligue 1": "Copa de Francia",
  "Liga Portugal": "Taça de Portugal",
  Eredivisie: "KNVB Beker",
};
const PRIMERA_DE: Record<string, string> = {
  "Segunda División": "LaLiga",
  Championship: "Premier League",
  "Serie B": "Serie A",
  "Ligue 2": "Ligue 1",
  "2. Bundesliga": "Bundesliga",
};

/** Liga en la que juega el club ahora (un recién ascendido ya es de primera). */
function ligaActual(club: ClubCarrera, escalon: Escalon): string {
  return club.escalon === 5 && escalon < 5 ? PRIMERA_DE[club.liga] ?? club.liga : club.liga;
}

/** Elegir una opción del escenario: aplica su efecto y juega la temporada. */
export function elegirOpcion(e: Estado, i: number): Estado {
  if (e.fase !== "escenario" || !e.escenario) return e;
  const opcion = e.escenario.opciones[i];
  if (!opcion) return e;
  const r = rng(e);
  const ef = opcion.efecto;
  let delta = ef.media ? entre(r, ef.media) : 0;
  let resultadoEleccion = ef.texto;
  if (ef.riesgo && r() < ef.riesgo.p) {
    delta = entre(r, ef.riesgo.media);
    resultadoEleccion = ef.riesgo.texto;
  }
  const mediaInicio = e.media;
  const media = limitar(e.media + delta, 40, 97);

  // Club donde se juega (cedido: uno de un escalón menos).
  const clubPropio = clubPorId(e.clubId)!;
  let escalonJuego = e.escalonClub;
  let cedidoEn: number | undefined;
  if (ef.cedido) {
    escalonJuego = Math.min(5, e.escalonClub + 1) as Escalon;
    const destino = elegirDe(r, CLUBES_CARRERA.filter((c) => c.escalon === escalonJuego && c.id !== e.clubId));
    cedidoEn = destino.id;
  }
  const clubJuego = cedidoEn ? clubPorId(cedidoEn)! : clubPropio;
  const liga = cedidoEn ? clubJuego.liga : ligaActual(clubPropio, e.escalonClub);

  // Minutos.
  const diff = media - NIVEL_ESCALON[escalonJuego];
  const lesionado = r() < (ef.lesion ?? 0) + 0.06;
  const titular = limitar(0.5 + diff * 0.08, 0.05, 0.97) * (ef.minutos ?? 1);
  const partidos = Math.round(
    limitar(MAX_PARTIDOS[escalonJuego] * titular * (lesionado ? 0.55 : 1) * (0.9 + r() * 0.2), 0, MAX_PARTIDOS[escalonJuego]),
  );

  // Goles y asistencias por partido según la posición.
  const m = media - 60;
  const ritmo = limitar(1 + diff * 0.02, 0.5, 1.6);
  const porGol = { POR: 0, DEF: 0.02 + m * 0.002, MED: 0.08 + m * 0.007, DEL: 0.22 + m * 0.014 }[e.posicion];
  const porAsist = { POR: 0, DEF: 0.04 + m * 0.003, MED: 0.12 + m * 0.009, DEL: 0.1 + m * 0.006 }[e.posicion];
  const goles = Math.max(0, Math.round(partidos * Math.max(0, porGol) * ritmo * (ef.goles ?? 1) * (0.75 + r() * 0.5)));
  const asistencias = Math.max(0, Math.round(partidos * Math.max(0, porAsist) * ritmo * (0.75 + r() * 0.5)));
  const porteriasCero =
    e.posicion === "POR" || e.posicion === "DEF"
      ? Math.round(partidos * limitar(0.2 + (6 - escalonJuego) * 0.05 + diff * 0.01, 0.1, 0.6) * (0.8 + r() * 0.4))
      : 0;

  // Nota de la temporada.
  const aporte =
    e.posicion === "DEL"
      ? (goles / Math.max(partidos, 1)) * 1.6
      : e.posicion === "MED"
        ? ((goles + asistencias) / Math.max(partidos, 1)) * 1.3
        : (porteriasCero / Math.max(partidos, 1)) * 1.2;
  const nota =
    partidos < 8 ? null : Math.round(limitar(6 + diff * 0.07 + aporte + (r() * 0.8 - 0.4) + (ef.nota ?? 0), 5, 9.6) * 10) / 10;

  // Trofeos del equipo: el escalón manda y tu temporada ayuda.
  const impacto = nota != null ? (nota - 6.5) * 0.25 * (partidos / MAX_PARTIDOS[escalonJuego]) : 0;
  const trofeos: string[] = [];
  let escalonClub = e.escalonClub;
  const dominante = liga === "Liga Portugal" || liga === "Eredivisie";
  const pLiga = { 1: 0.32, 2: 0.1, 3: dominante ? 0.33 : 0.03, 4: 0.005, 5: 0.12 }[escalonJuego] + impacto * 0.3;
  if (escalonJuego === 5) {
    if (r() < pLiga) trofeos.push(`Campeón de ${liga}`);
    if (trofeos.length || r() < 0.22 + impacto * 0.4) {
      trofeos.push("Ascenso a Primera");
      if (!cedidoEn) escalonClub = 4;
    }
  } else {
    if (r() < pLiga) trofeos.push(liga);
    const pCopa = { 1: 0.22, 2: 0.15, 3: 0.08, 4: 0.04, 5: 0 }[escalonJuego] + impacto * 0.1;
    if (COPA[liga] && r() < pCopa) trofeos.push(COPA[liga]);
    const pChampions = { 1: 0.15, 2: 0.06, 3: 0.012, 4: 0, 5: 0 }[escalonJuego] + (escalonJuego <= 2 ? impacto * 0.15 : 0);
    if (r() < pChampions) trofeos.push("Champions League");
    else if ((escalonJuego === 3 || escalonJuego === 4) && r() < (escalonJuego === 3 ? 0.08 : 0.025)) trofeos.push("Europa League");
  }

  // Selección: convocado si da el nivel; en verano, Mundial o torneo continental.
  let seleccion: Temporada["seleccion"];
  const nacion = nacionPorCodigo(e.nacion);
  if (media >= umbralSeleccion({ ...e, media }) && e.edad >= 18) {
    const pj = 4 + Math.round(r() * 6);
    const g = Math.round(pj * Math.max(0, porGol) * (0.6 + r() * 0.6));
    seleccion = { partidos: pj, goles: g };
    const verano = e.anio + 1;
    const torneo = verano % 4 === 2 ? "Mundial" : verano % 4 === 0 ? nacion.continental : null;
    if (torneo && r() < limitar(nacion.fuerza * (1 + (media - 82) * 0.04) * (torneo === "Mundial" ? 1 : 1.3), 0.01, 0.4)) {
      trofeos.push(`${torneo} ${verano} con ${nacion.nombre}`);
    }
  }

  // Premios individuales (con una temporada de verdad).
  const premios: string[] = [];
  if (nota != null && partidos >= 20) {
    if (e.edad <= 21 && media >= 78 && nota >= 7.2 && r() < 0.6) premios.push("Golden Boy");
    const golesLiga = goles * 0.72;
    if (e.posicion === "DEL" && golesLiga >= 30 && r() < 0.7) premios.push("Bota de Oro");
    else if (e.posicion === "DEL" && golesLiga >= 21 && escalonJuego <= 4 && r() < 0.6) premios.push(`Máximo goleador de ${liga}`);
    if (e.posicion === "POR" && media >= 86 && porteriasCero >= 18 && r() < 0.5) premios.push("Trofeo Yashin");
    if (nota >= 7.8 && escalonJuego <= 4 && r() < 0.5) premios.push(`Mejor jugador de ${liga}`);
    if (media >= 88 && nota >= 7.4 && r() < 0.6) premios.push("Once del año FIFA");
    const grande = trofeos.some((t) => t === "Champions League" || t.startsWith("Mundial"));
    const pBalon = limitar(0.1 + (media - 88) * 0.1 + (nota - 7.5) * 0.35 + (grande ? 0.25 : 0), 0, 0.75);
    // A porteros y defensas casi nunca se lo dan.
    const factor = e.posicion === "POR" || e.posicion === "DEF" ? 0.3 : 1;
    if (media >= 88 && nota >= 7.4 && escalonJuego <= 2 && r() < pBalon * factor) premios.push("Balón de Oro");
  }

  const temporada: Temporada = {
    anio: e.anio,
    edad: e.edad,
    clubId: e.clubId,
    cedidoEn,
    mediaInicio,
    media,
    partidos,
    goles,
    asistencias,
    porteriasCero,
    nota,
    trofeos,
    premios,
    seleccion,
    eleccion: opcion.texto,
    resultadoEleccion,
    lesionado,
  };

  // Evolución de la media tras la temporada.
  const media2 = evolucionar({ ...e, media }, temporada, ef.declive ?? 1, r);
  temporada.media = media2;

  return {
    ...e,
    paso: e.paso + 1,
    media: media2,
    escalonClub,
    fase: "resultado",
    ultimoEscenario: e.escenario.id,
    historial: [...e.historial, temporada],
  };
}

function evolucionar(e: Estado, t: Temporada, declive: number, r: () => number): number {
  const margen = e.potencial - e.media;
  let g: number;
  if (e.edad <= 21) g = margen * 0.2;
  else if (e.edad <= 26) g = margen * 0.14;
  else if (e.edad <= 29) g = (margen > 0 ? 0.6 : 0) + (r() * 2 - 1);
  else if (e.edad <= 31) g = -(r() * 2) * declive;
  else if (e.edad <= 33) g = -(1 + r() * 2) * declive;
  else g = -(2 + r() * 2.5) * declive;
  if (e.edad < 27 && t.partidos < 10) g *= 0.5;
  if (t.nota != null) g += (t.nota - 6.6) * 0.4;
  return limitar(Math.round(e.media + g), 40, 97);
}

// ── Ofertas ──
/** Tras ver la temporada: ofertas según el rendimiento (o el final). */
export function pasarAOfertas(e: Estado): Estado {
  if (e.fase !== "resultado") return e;
  if (e.edad + 1 >= EDAD_RETIRO) return { ...e, fase: "fin" };
  const r = rng(e);
  const t = e.historial[e.historial.length - 1];
  const rendimiento = t.nota ?? 5.5;
  const ofertas: number[] = [];
  const otros = (escalon: Escalon) => CLUBES_CARRERA.filter((c) => c.escalon === escalon && c.id !== e.clubId);

  // Muy por debajo del nivel del club: no te renueva y solo llaman los de un
  // escalón menos (si no, acababas a los 38 en el Madrid jugando 3 partidos).
  if (e.media < nivel(e) - 6 && rendimiento < 6.5 && e.escalonClub < 5) {
    const abajo = otros((e.escalonClub + 1) as Escalon);
    const a = elegirDe(r, abajo);
    const b = elegirDe(r, abajo.filter((c) => c.id !== a.id));
    return { ...e, paso: e.paso + 1, fase: "ofertas", sinRenovar: true, ofertas: [a.id, b.id] };
  }

  // Uno de igual tamaño si la temporada fue aceptable.
  if (rendimiento >= 6.3 || e.media >= nivel(e)) ofertas.push(elegirDe(r, otros(e.escalonClub)).id);
  // Mejores: solo si la media y la temporada lo justifican. Con la edad cuesta más.
  const exigencia = e.edad >= 31 ? 0.5 : 0;
  for (let salto = 2; salto >= 1; salto--) {
    const destino = (e.escalonClub - salto) as Escalon;
    if (destino < 1) continue;
    // A la élite solo se llega siendo de élite.
    const elite = destino === 1 ? 0.3 : 0;
    const listo =
      e.media >= NIVEL_ESCALON[destino] - (salto === 1 ? 2 : 0) && rendimiento >= (salto === 1 ? 6.9 : 7.5) + exigencia + elite;
    if (listo) {
      const lista = otros(destino);
      ofertas.push(elegirDe(r, lista).id);
      if (salto === 1 && rendimiento >= 7.2 && lista.length > 1) {
        const segunda = elegirDe(r, lista.filter((c) => !ofertas.includes(c.id)));
        if (segunda) ofertas.push(segunda.id);
      }
      break;
    }
  }
  return { ...e, paso: e.paso + 1, fase: "ofertas", sinRenovar: false, ofertas: [...new Set(ofertas)] };
}

/** ¿Toca preguntar por la retirada? (cumple 34 o más) */
export const puedeRetirarse = (e: Estado) => e.edad + 1 >= EDAD_PREGUNTA_RETIRO;

/** Decidir: seguir (null), fichar por un club ofrecido, o retirarse. */
export function decidir(e: Estado, decision: { tipo: "seguir" } | { tipo: "fichar"; clubId: number } | { tipo: "retirarse" }): Estado {
  if (e.fase !== "ofertas") return e;
  if (decision.tipo === "retirarse") {
    if (!puedeRetirarse(e)) return e;
    return { ...e, fase: "fin" };
  }
  if (decision.tipo === "seguir" && e.sinRenovar) return e;
  let clubId = e.clubId;
  let escalonClub = e.escalonClub;
  if (decision.tipo === "fichar" && e.ofertas.includes(decision.clubId)) {
    clubId = decision.clubId;
    escalonClub = clubPorId(clubId)!.escalon;
  }
  const siguiente: Estado = { ...e, clubId, escalonClub, edad: e.edad + 1, anio: e.anio + 1, fase: "escenario", ofertas: [] };
  return { ...siguiente, paso: e.paso + 1, escenario: generarEscenario({ ...siguiente, paso: e.paso + 1 }) };
}

// ── Resumen ──
export type Resumen = {
  temporadas: number;
  partidos: number;
  goles: number;
  asistencias: number;
  porteriasCero: number;
  mediaMax: number;
  trofeos: [string, number][];
  premios: [string, number][];
  clubes: number[];
  internacional: { partidos: number; goles: number };
  legado: number;
  titulo: string;
};

const contar = (lista: string[]) => {
  const m = new Map<string, number>();
  for (const x of lista) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
};

export function resumen(e: Estado): Resumen {
  const h = e.historial;
  const suma = (f: (t: Temporada) => number) => h.reduce((s, t) => s + f(t), 0);
  const trofeos = h.flatMap((t) => t.trofeos);
  const premios = h.flatMap((t) => t.premios);
  const balones = premios.filter((p) => p === "Balón de Oro").length;
  const champions = trofeos.filter((t) => t === "Champions League").length;
  const mundiales = trofeos.filter((t) => t.startsWith("Mundial")).length;
  const mediaMax = Math.max(...h.map((t) => t.media), e.media);
  const legado = Math.round(
    suma((t) => t.goles) * 1 + suma((t) => t.asistencias) * 0.6 + suma((t) => t.porteriasCero) * 0.8 + trofeos.length * 25 + champions * 60 + mundiales * 120 + premios.length * 40 + balones * 250 + (mediaMax - 60) * 12,
  );
  const titulo =
    balones >= 3 || legado >= 2800
      ? "Leyenda del fútbol mundial"
      : balones >= 1 || legado >= 1700
        ? "Uno de los mejores de su generación"
        : legado >= 950
          ? "Ídolo de la afición"
          : legado >= 450
            ? "Una carrera digna"
            : "La promesa que no llegó a explotar";
  const clubes = [...new Set(h.map((t) => t.clubId))];
  return {
    temporadas: h.length,
    partidos: suma((t) => t.partidos),
    goles: suma((t) => t.goles),
    asistencias: suma((t) => t.asistencias),
    porteriasCero: suma((t) => t.porteriasCero),
    mediaMax,
    trofeos: contar(trofeos),
    premios: contar(premios),
    clubes,
    internacional: { partidos: suma((t) => t.seleccion?.partidos ?? 0), goles: suma((t) => t.seleccion?.goles ?? 0) },
    legado,
    titulo,
  };
}
