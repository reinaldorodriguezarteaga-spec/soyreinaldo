import { aleatorio } from "../diario";
import { CLUBES_FICHAN, NIVEL_ESCALON, clubPorId, nacionPorCodigo, type ClubCarrera, type Escalon } from "./clubes";

/**
 * Modo carrera (27-oct, pedido del dueño): de los 15-17 años en un equipo de
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
/** Se puede empezar con 15, 16 o 17 (30-oct): más joven, menos media y más temporadas. */
export const EDADES_INICIO = [15, 16, 17] as const;
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
  /** Un título que solo da este escenario (oro olímpico, Mundial Sub-20…). */
  trofeo?: { p: number; nombre: string };
  /** Multiplica lo lejos que llega tu selección en el torneo del verano. */
  torneo?: number;
  /** Suma a la media para entrar en la convocatoria (o resta). */
  convocatoria?: number;
  /** Dejas la selección para siempre. */
  adiosSeleccion?: boolean;
  /** Cómo sale si va bien. */
  texto: string;
};
export type Opcion = { texto: string; efecto: Efecto };
export type Escenario = {
  id: string;
  titulo: string;
  texto: string;
  opciones: Opcion[];
  /** Pregunta de mitad de temporada (versión extendida, 28-oct). */
  mitad?: boolean;
};

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
  seleccion?: {
    partidos: number;
    goles: number;
    /** El Mundial o el torneo continental del verano: hasta dónde llegasteis. */
    torneo?: { nombre: string; ronda: Ronda; partidos: number; goles: number };
  };
  /** Puesto en la votación del Balón de Oro (si entró entre los 30). */
  balonPuesto?: number;
  eleccion: string;
  resultadoEleccion: string;
  /** Versión extendida: lo que elegiste a mitad de temporada. */
  invierno?: { eleccion: string; resultado: string };
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
  /** Escenarios ya vistos, para no repetirlos (28-oct). */
  usados: string[];
  /** Versión extendida: también una pregunta a mitad de temporada. */
  extendido: boolean;
  /** Lo elegido en pretemporada, a la espera de la de mitad de temporada. */
  pendiente: {
    id: string;
    efecto: Efecto;
    delta: number;
    eleccion: string;
    resultado: string;
    trofeo: string | null;
    /** Cedido desde pretemporada: el club de toda la temporada. */
    cedidoEn?: number;
    /** La primera vuelta ya jugada, para decidir viéndola (28-oct). */
    primeraMitad: Tramo & { nota: number | null; media: number };
  } | null;
  ofertas: number[];
  /** El club no te renueva: no hay «seguir». */
  sinRenovar?: boolean;
  /** Con 24 años ya no se puede seguir en un filial. */
  finFilial?: boolean;
  /** Ofertas de cesión de una temporada (28-oct). */
  cesiones?: number[];
  /** Esta temporada juegas cedido en este club y luego vuelves. */
  cesion: number | null;
  /** Renunció a la selección: ya no le convocan. */
  adiosSeleccion?: boolean;
  historial: Temporada[];
};

export type Ronda = "sin clasificar" | "grupos" | "octavos" | "cuartos" | "semifinales" | "final" | "campeon";
export const TEXTO_RONDA: Record<Ronda, string> = {
  "sin clasificar": "no os clasificasteis",
  grupos: "fuera en la fase de grupos",
  octavos: "fuera en octavos",
  cuartos: "fuera en cuartos",
  semifinales: "fuera en semifinales",
  final: "subcampeones",
  campeon: "¡campeones!",
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
    vale: (e) => e.media < nivel(e) - 2 && e.escalonClub < 5 && !e.cesion,
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
    vale: (e) => convocable(e, -2),
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
  // ── Selección y Mundiales (28-oct, pedido del dueño) ──
  {
    id: "mundial-previa",
    peso: 7,
    vale: (e) => convocable(e, -1) && torneoDelVerano(e) === "Mundial",
    crea: (e) => ({
      id: "mundial-previa",
      titulo: "Año de Mundial",
      texto: `Este verano se juega el Mundial ${e.anio + 1} y ${nacionPorCodigo(e.nacion).nombre} cuenta contigo. ¿Cómo encaras la temporada?`,
      opciones: [
        { texto: "Dosificarte para llegar fresco al Mundial", efecto: { minutos: 0.85, torneo: 1.35, convocatoria: 1, texto: "Llegas al Mundial como un tiro." } },
        {
          texto: "Darlo todo con tu club, sin pensar en el verano",
          efecto: { media: [0, 1], nota: 0.2, torneo: 0.9, texto: "Temporadón con tu club y al Mundial con confianza.", riesgo: { p: 0.25, media: [-1, 0], texto: "Llegas fundido al Mundial: el cuerpo dice basta." } },
        },
        { texto: "Pedir al club un plan físico especial", efecto: { media: [0, 1], declive: 0.9, torneo: 1.15, texto: "El plan funciona: llegas al verano en tu pico de forma." } },
      ],
    }),
  },
  {
    id: "continental-previa",
    peso: 6,
    vale: (e) => convocable(e, -1) && !!torneoDelVerano(e) && torneoDelVerano(e) !== "Mundial",
    crea: (e) => {
      const torneo = torneoDelVerano(e)!;
      return {
        id: "continental-previa",
        titulo: `${torneo} a la vista`,
        texto: `En verano hay ${torneo}. El seleccionador te avisa: quiere verte en forma y con minutos.`,
        opciones: [
          { texto: "Buscar minutos donde sea", efecto: { minutos: 1.15, convocatoria: 2, torneo: 1.1, texto: "Juegas todo y llegas rodado." } },
          { texto: "Cuidarte para llegar a tope", efecto: { minutos: 0.9, torneo: 1.25, texto: "Llegas fresco y con hambre." } },
          { texto: "Olvidarte del verano y centrarte en el club", efecto: { media: [0, 1], nota: 0.15, torneo: 0.9, texto: "El club agradece tu compromiso." } },
        ],
      };
    },
  },
  {
    id: "capitan-seleccion",
    peso: 3,
    vale: (e) => convocable(e, 2) && e.edad >= 26,
    crea: (e) => ({
      id: "capitan-seleccion",
      titulo: "El brazalete",
      texto: `Se retira el capitán de ${nacionPorCodigo(e.nacion).nombre} y el vestuario te elige a ti para llevar el brazalete.`,
      opciones: [
        { texto: "Aceptarlo con orgullo", efecto: { nota: 0.15, torneo: 1.1, convocatoria: 4, texto: "Capitán de tu país: el grupo te sigue a muerte." } },
        { texto: "Que lo lleve otro, tú a jugar", efecto: { media: [0, 1], texto: "Prefieres liderar con el balón." } },
      ],
    }),
  },
  {
    id: "fuera-lista",
    peso: 4,
    vale: (e) => !e.adiosSeleccion && e.edad >= 20 && e.media >= umbralSeleccion(e) - 5 && e.media < umbralSeleccion(e),
    crea: (e) => ({
      id: "fuera-lista",
      titulo: "Fuera de la lista",
      texto: `Sale la convocatoria de ${nacionPorCodigo(e.nacion).nombre} y tu nombre no está. La prensa pregunta por ti.`,
      opciones: [
        { texto: "Responder en el campo", efecto: { media: [0, 1], nota: 0.2, convocatoria: 2, texto: "Golpeas la puerta cada fin de semana hasta que te abren." } },
        {
          texto: "Pedir explicaciones en rueda de prensa",
          efecto: { convocatoria: -3, nota: 0.1, texto: "Se monta un lío y el seleccionador no te lo perdona.", riesgo: { p: 0.3, media: [0, 1], texto: "La afición te da la razón y el lío te motiva." } },
        },
        { texto: "Asumirlo y no pensar en ello", efecto: { media: [0, 1], declive: 0.95, texto: "Sin la presión de la selección juegas más suelto." } },
      ],
    }),
  },
  {
    id: "nations-league",
    peso: 4,
    vale: (e) => convocable(e) && nacionPorCodigo(e.nacion).continental === "Eurocopa" && (e.anio + 1) % 2 === 1,
    crea: (e) => {
      const n = nacionPorCodigo(e.nacion);
      return {
        id: "nations-league",
        titulo: "Final Four de la Nations League",
        texto: `${n.nombre} se ha metido en la fase final de la Nations League. Se juega en junio, con la temporada ya terminada.`,
        opciones: [
          { texto: "Ir a por el título", efecto: { lesion: 0.05, trofeo: { p: limitar(n.fuerza * 2.2, 0.06, 0.45), nombre: `Nations League con ${n.nombre}` }, texto: "Te quedas sin vacaciones, pero vives otra final." } },
          { texto: "Pedir descanso: llevas 60 partidos", efecto: { declive: 0.9, texto: "Descansas de verdad y arrancas la temporada fresco." } },
        ],
      };
    },
  },
  {
    id: "finalissima",
    peso: 6,
    vale: (e) => {
      const n = nacionPorCodigo(e.nacion);
      return convocable(e) && ["Eurocopa", "Copa América"].includes(n.continental) && !!e.historial.at(-1)?.trofeos.some((t) => t.startsWith(n.continental));
    },
    crea: (e) => {
      const n = nacionPorCodigo(e.nacion);
      const rival = n.continental === "Eurocopa" ? "el campeón de América" : "el campeón de Europa";
      return {
        id: "finalissima",
        titulo: "La Finalissima",
        texto: `Como campeones de la ${n.continental}, ${n.nombre} se mide a ${rival} en Wembley.`,
        opciones: [
          { texto: "Jugarla: es otro título", efecto: { lesion: 0.03, trofeo: { p: 0.5, nombre: `Finalissima con ${n.nombre}` }, texto: "Noche grande en Wembley." } },
          { texto: "Pedir que jueguen los menos habituales", efecto: { declive: 0.95, media: [0, 1], texto: "Ves la final desde el palco, descansado." } },
        ],
      };
    },
  },
  {
    id: "mundial-clubes",
    peso: 6,
    vale: (e) => e.escalonClub <= 2 && !e.cesion && [2029, 2033, 2037, 2041].includes(e.anio),
    crea: (e) => ({
      id: "mundial-clubes",
      titulo: `Mundial de Clubes ${e.anio}`,
      texto: `El ${clubPorId(e.clubId)!.nombre} juega el Mundial de Clubes en pleno verano. Se acaban las vacaciones.`,
      opciones: [
        { texto: "Jugarlo a tope", efecto: { lesion: 0.07, trofeo: { p: e.escalonClub === 1 ? 0.3 : 0.14, nombre: "Mundial de Clubes" }, texto: "Un mes de torneo con calor de verdad." } },
        { texto: "Pedir minutos dosificados", efecto: { declive: 0.92, trofeo: { p: e.escalonClub === 1 ? 0.2 : 0.09, nombre: "Mundial de Clubes" }, texto: "Juegas lo justo y llegas entero a la liga." } },
      ],
    }),
  },
  {
    id: "adios-seleccion",
    peso: 4,
    vale: (e) => convocable(e) && e.edad >= 31,
    crea: (e) => ({
      id: "adios-seleccion",
      titulo: "¿Adiós a la selección?",
      texto: `Con ${e.edad} años, el cuerpo empieza a notar los viajes con ${nacionPorCodigo(e.nacion).nombre}. Hay quien te pide que te retires de la selección.`,
      opciones: [
        { texto: "Seguir mientras te llamen", efecto: { media: [0, 0], texto: "Tu país es lo primero." } },
        { texto: "Anunciar tu retirada internacional", efecto: { adiosSeleccion: true, declive: 0.75, minutos: 1.05, texto: "Te despides entre aplausos y te centras en el club." } },
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

  {
    id: "derbi",
    peso: 3,
    vale: () => true,
    crea: () => ({
      id: "derbi",
      titulo: "Semana de derbi",
      texto: "Un jugador del eterno rival te lleva toda la semana provocando en redes.",
      opciones: [
        { texto: "Responder en el campo, con un golazo", efecto: { nota: 0.3, media: [0, 1], texto: "Le das la respuesta con el balón y la grada te corea.", riesgo: { p: 0.25, media: [-1, 0], texto: "Te picas, ves la roja y te caen tres partidos." } } },
        { texto: "Ignorarlo y concentrarte", efecto: { media: [0, 1], texto: "Ni caso. Sales con la cabeza fría." } },
        { texto: "Contestarle en redes", efecto: { nota: 0.1, texto: "Tu respuesta se hace viral y te convierte en ídolo.", riesgo: { p: 0.45, media: [-2, -1], texto: "Se te va de las manos y el club te multa." } } },
      ],
    }),
  },
  {
    id: "dorsal10",
    peso: 2,
    vale: (e) => e.edad >= 20 && e.edad <= 29 && e.media >= nivel(e) && e.posicion !== "POR",
    crea: () => ({
      id: "dorsal10",
      titulo: "El 10 está libre",
      texto: "Se ha ido la estrella del equipo y su dorsal, el 10, queda libre.",
      opciones: [
        { texto: "Pedir el 10: es tu momento", efecto: { nota: 0.3, media: [0, 2], texto: "Te pesa cero: el 10 te queda que ni pintado.", riesgo: { p: 0.3, media: [-2, -1], texto: "El 10 te pesa más de la cuenta." } } },
        { texto: "Quedarte con tu número de siempre", efecto: { media: [0, 1], texto: "Tu número, tu historia." } },
      ],
    }),
  },
  {
    id: "titular-lesionado",
    peso: 3,
    vale: (e) => e.media < nivel(e) + 2,
    crea: () => ({
      id: "titular-lesionado",
      titulo: "Se abre una puerta",
      texto: "El titular de tu puesto se rompe en pretemporada. El míster te mira a ti.",
      opciones: [
        { texto: "Aprovechar la oportunidad a muerte", efecto: { minutos: 1.35, media: [1, 2], texto: "Te haces con el puesto y ya no lo sueltas." } },
        { texto: "Ir poco a poco, sin presión", efecto: { minutos: 1.15, media: [0, 1], texto: "Vas sumando minutos sin agobios." } },
      ],
    }),
  },
  {
    id: "psicologo",
    peso: 2,
    vale: (e) => e.edad >= 19,
    crea: (e) => ({
      id: "psicologo",
      titulo: "Bloqueo",
      texto: e.posicion === "POR" ? "Llevas semanas dudando en cada salida por alto." : e.posicion === "DEL" ? "Llevas diez partidos sin marcar y te pesa cada ocasión." : "Llevas un mes en el que no te sale nada.",
      opciones: [
        { texto: "Trabajar con un psicólogo deportivo", efecto: { media: [1, 2], nota: 0.2, texto: "Recuperas la confianza y vuelves más fuerte." } },
        { texto: "Tirar de orgullo, ya saldrá", efecto: { media: [0, 1], texto: "Sale. Como siempre.", riesgo: { p: 0.4, media: [-2, -1], texto: "La racha se alarga más de lo que esperabas." } } },
      ],
    }),
  },
  {
    id: "documental",
    peso: 2,
    vale: (e) => e.media >= 78,
    crea: () => ({
      id: "documental",
      titulo: "Cámaras en casa",
      texto: "Una plataforma quiere grabar un documental sobre tu temporada, día a día.",
      opciones: [
        { texto: "Aceptar: que el mundo te conozca", efecto: { nota: 0.2, media: [-1, 1], texto: "El documental es un éxito y te ganas a medio mundo." } },
        { texto: "Rechazarlo: tu vida es tuya", efecto: { media: [0, 1], texto: "Privacidad y fútbol, nada más." } },
      ],
    }),
  },
  {
    id: "portada",
    peso: 2,
    vale: (e) => e.media >= 84,
    crea: () => ({
      id: "portada",
      titulo: "La portada del videojuego",
      texto: "El videojuego de fútbol más vendido te quiere en su portada. Dicen que está maldita…",
      opciones: [
        { texto: "Aceptar, las maldiciones no existen", efecto: { nota: 0.2, lesion: 0.18, texto: "Sales en la portada y en millones de consolas." } },
        { texto: "Mejor no tentar a la suerte", efecto: { media: [0, 1], texto: "Que salga otro." } },
      ],
    }),
  },
  {
    id: "sub20",
    peso: 4,
    vale: (e) => e.edad >= 18 && e.edad <= 20 && (e.anio + 1) % 2 === 1,
    crea: (e) => ({
      id: "sub20",
      titulo: "Mundial Sub-20",
      texto: `${nacionPorCodigo(e.nacion).nombre} te convoca para el Mundial Sub-20 de este verano.`,
      opciones: [
        { texto: "Ir a por el Mundial", efecto: { media: [1, 2], trofeo: { p: limitar(nacionPorCodigo(e.nacion).fuerza * 2, 0.05, 0.4), nombre: `Mundial Sub-20 con ${nacionPorCodigo(e.nacion).nombre}` }, texto: "Vuelves con experiencia internacional." } },
        { texto: "Quedarte a hacer la pretemporada", efecto: { media: [0, 1], minutos: 1.1, texto: "Te ganas al míster desde el primer día." } },
      ],
    }),
  },
  {
    id: "olimpicos",
    peso: 5,
    vale: (e) => e.edad <= 23 && e.media >= 70 && [2028, 2032, 2036].includes(e.anio + 1),
    crea: (e) => ({
      id: "olimpicos",
      titulo: "Juegos Olímpicos",
      texto: `Te llaman para los Juegos Olímpicos de ${e.anio + 1}. El club preferiría que te quedases.`,
      opciones: [
        { texto: "Ir a por el oro", efecto: { lesion: 0.06, trofeo: { p: limitar(nacionPorCodigo(e.nacion).fuerza * 2.2, 0.05, 0.45), nombre: `Oro olímpico con ${nacionPorCodigo(e.nacion).nombre}` }, texto: "Vives la experiencia de tu vida en la villa olímpica." } },
        { texto: "Hacer caso al club", efecto: { media: [0, 1], nota: 0.1, texto: "El club valora tu compromiso." } },
      ],
    }),
  },
  {
    id: "gira",
    peso: 2,
    vale: (e) => e.escalonClub <= 3,
    crea: () => ({
      id: "gira",
      titulo: "Gira de pretemporada",
      texto: "Pretemporada por Asia y Estados Unidos: vuelos, calor y partidos cada tres días.",
      opciones: [
        { texto: "Darlo todo en cada amistoso", efecto: { media: [1, 2], lesion: 0.08, texto: "Llegas al inicio de liga en tu mejor versión." } },
        { texto: "Dosificarte para la temporada", efecto: { media: [0, 1], texto: "Llegas fresco al primer partido oficial." } },
      ],
    }),
  },
  {
    id: "padre",
    peso: 2,
    vale: (e) => e.edad >= 24 && e.edad <= 36,
    crea: () => ({
      id: "padre",
      titulo: "¡Vas a ser padre!",
      texto: "Tu pareja está embarazada y el parto cae en mitad de la temporada.",
      opciones: [
        { texto: "Pedir unos días para estar con tu familia", efecto: { minutos: 0.95, nota: 0.2, texto: "Celebras el siguiente gol con el chupete en la boca." } },
        { texto: "Seguir a tope, no perderte ni un partido", efecto: { media: [0, 1], texto: "Vas del paritorio al estadio." } },
      ],
    }),
  },
  {
    id: "vestuario",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "vestuario",
      titulo: "Bronca en el vestuario",
      texto: "Dos pesos pesados del equipo se pelean tras una derrota. Todos te miran.",
      opciones: [
        { texto: "Mediar y calmar las aguas", efecto: { nota: 0.2, texto: "Te ganas el respeto de todo el vestuario." } },
        { texto: "Ponerte del lado del capitán", efecto: { media: [0, 1], texto: "El capitán no lo olvida.", riesgo: { p: 0.35, media: [-1, 0], texto: "El otro bando te hace el vacío." } } },
        { texto: "No meterte", efecto: { texto: "Ni frío ni calor." } },
      ],
    }),
  },
  {
    id: "var",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "var",
      titulo: "El VAR",
      texto: "El VAR te anula un gol decisivo por un fuera de juego milimétrico.",
      opciones: [
        { texto: "Ir a por el árbitro", efecto: { minutos: 0.92, texto: "Te desahogas… y te caen tres partidos." } },
        { texto: "Morderte la lengua y seguir", efecto: { media: [0, 1], nota: 0.1, texto: "Marcas el siguiente y no hay VAR que lo anule." } },
      ],
    }),
  },
  {
    id: "pitos",
    peso: 3,
    vale: (e) => e.media < nivel(e) && e.edad >= 20,
    crea: () => ({
      id: "pitos",
      titulo: "Pitos en casa",
      texto: "Tras un mal partido, tu propia afición te pita al ser sustituido.",
      opciones: [
        { texto: "Besar el escudo mirando a la grada", efecto: { nota: 0.2, texto: "La grada acaba coreando tu nombre.", riesgo: { p: 0.4, media: [-1, 0], texto: "Lo toman como una provocación y los pitos van a más." } } },
        { texto: "Pedir perdón y trabajar el doble", efecto: { media: [1, 2], texto: "Te los ganas a base de sudor." } },
        { texto: "Cerrar las redes y desconectar", efecto: { media: [0, 1], texto: "Sin ruido, todo fluye mejor." } },
      ],
    }),
  },
  {
    id: "preparador",
    peso: 2,
    vale: (e) => e.edad >= 21 && e.edad <= 29,
    crea: () => ({
      id: "preparador",
      titulo: "Preparador personal",
      texto: "Contratas un preparador físico personal. ¿En qué te centras?",
      opciones: [
        { texto: "Fuerza y potencia", efecto: { media: [1, 2], lesion: 0.05, texto: "Ganas músculo y ya nadie te mueve." } },
        { texto: "Velocidad y agilidad", efecto: { media: [1, 2], texto: "Ahora eres un rayo." } },
        { texto: "Prevención de lesiones", efecto: { media: [0, 1], declive: 0.8, texto: "Tu cuerpo te lo agradecerá en unos años." } },
      ],
    }),
  },
  {
    id: "cruzado",
    peso: 1,
    vale: (e) => e.edad >= 21,
    crea: () => ({
      id: "cruzado",
      titulo: "Rotura del cruzado",
      texto: "El peor diagnóstico: rotura del ligamento cruzado.",
      opciones: [
        { texto: "Operarte: siete meses fuera", efecto: { minutos: 0.4, media: [-2, 0], texto: "Vuelves en primavera, con mucha hambre." } },
        { texto: "Tratamiento conservador para volver antes", efecto: { minutos: 0.8, media: [-1, 0], texto: "Vuelves antes de lo previsto.", riesgo: { p: 0.5, media: [-4, -2], texto: "La rodilla no aguanta y vuelves a caer." } } },
      ],
    }),
  },
  {
    id: "debut-champions",
    peso: 4,
    vale: (e) => e.escalonClub <= 3 && e.edad <= 25 && !e.historial.some((t) => (clubPorId(t.clubId)?.escalon ?? 5) <= 3),
    crea: () => ({
      id: "debut-champions",
      titulo: "Noche de Champions",
      texto: "Debutas en la Champions con el himno sonando y el estadio lleno.",
      opciones: [
        { texto: "Jugar con descaro, como en el patio", efecto: { nota: 0.3, media: [1, 2], texto: "Te sales y medio continente pregunta quién eres.", riesgo: { p: 0.3, media: [-1, 0], texto: "Te pueden los nervios y te cambian al descanso." } } },
        { texto: "Jugar sencillo, sin errores", efecto: { media: [0, 1], texto: "Partido serio y sin fallos." } },
      ],
    }),
  },
  {
    id: "panenka",
    peso: 2,
    vale: (e) => e.escalonClub <= 3 && e.posicion !== "POR",
    crea: () => ({
      id: "panenka",
      titulo: "Penalti en la final",
      texto: "Final de la Supercopa, último minuto, penalti a favor. El balón es tuyo.",
      opciones: [
        { texto: "Tirarlo a lo Panenka", efecto: { nota: 0.4, trofeo: { p: 0.55, nombre: "Supercopa" }, texto: "La picas y te sale. Leyenda.", riesgo: { p: 0.45, media: [-1, 0], texto: "El portero se queda quieto y la para con el pecho. Memes para años." } } },
        { texto: "Fuerte y a la escuadra", efecto: { nota: 0.2, trofeo: { p: 0.75, nombre: "Supercopa" }, texto: "Imparable. Final ganada." } },
        { texto: "Dejárselo al capitán", efecto: { texto: "El capitán asume la responsabilidad." } },
      ],
    }),
  },
  {
    id: "estrella-fichada",
    peso: 3,
    vale: (e) => e.escalonClub <= 3 && e.edad <= 30,
    crea: () => ({
      id: "estrella-fichada",
      titulo: "Fichaje galáctico",
      texto: "El club ficha a una estrella mundial para tu puesto.",
      opciones: [
        { texto: "Competir de tú a tú", efecto: { media: [1, 2], texto: "Te creces con la competencia.", riesgo: { p: 0.35, media: [0, 0], texto: "La estrella te come la tostada y juegas poco." } } },
        { texto: "Aprender de él y esperar", efecto: { media: [1, 2], minutos: 0.75, texto: "Aprendes muchísimo, aunque juegas menos." } },
      ],
    }),
  },
  {
    id: "idioma",
    peso: 3,
    vale: (e) => {
      const liga = clubPorId(e.clubId)?.liga ?? "";
      const casa: Record<string, string[]> = { es: ["LaLiga", "Segunda División", "Primera Federación"], "gb-eng": ["Premier League", "Championship", "Premier League 2"], it: ["Serie A", "Serie B", "Serie C"], fr: ["Ligue 1", "Ligue 2"], de: ["Bundesliga", "2. Bundesliga", "Regionalliga"], pt: ["Liga Portugal", "Liga Portugal 2"], nl: ["Eredivisie", "Eerste Divisie"] };
      return !(casa[e.nacion] ?? []).includes(liga) && e.historial.length > 0 && e.historial.at(-1)!.clubId !== e.clubId;
    },
    crea: () => ({
      id: "idioma",
      titulo: "Nuevo país",
      texto: "Llegas a un país nuevo y no entiendes ni las charlas del míster.",
      opciones: [
        { texto: "Clases intensivas del idioma", efecto: { media: [1, 2], texto: "A los dos meses ya bromeas con el utillero." } },
        { texto: "Tirar de inglés y de gestos", efecto: { media: [-1, 1], texto: "Te apañas como puedes." } },
      ],
    }),
  },
  {
    id: "chaval",
    peso: 3,
    vale: (e) => e.edad >= 30,
    crea: () => ({
      id: "chaval",
      titulo: "El relevo",
      texto: "Un chaval de la cantera, de tu posición, te pide que le enseñes.",
      opciones: [
        { texto: "Apadrinarlo como hicieron contigo", efecto: { nota: 0.2, declive: 0.9, texto: "Enseñarle te mantiene joven." } },
        { texto: "Bastante tienes con lo tuyo", efecto: { media: [0, 1], texto: "Te centras en tu juego." } },
      ],
    }),
  },
  {
    id: "renovacion",
    peso: 2,
    vale: (e) => e.edad >= 22 && e.edad <= 31 && e.media >= nivel(e),
    crea: () => ({
      id: "renovacion",
      titulo: "La renovación",
      texto: "El club quiere renovarte, pero tu agente pide el doble de lo que ofrecen.",
      opciones: [
        { texto: "Firmar ya y olvidarte del tema", efecto: { media: [0, 1], nota: 0.1, texto: "Renovado y con la cabeza en el campo." } },
        { texto: "Apretar hasta el final", efecto: { media: [0, 1], texto: "Te dan lo que pedías.", riesgo: { p: 0.4, media: [-1, 0], texto: "La directiva te deja unas semanas en la grada." } } },
      ],
    }),
  },
  {
    id: "stream",
    peso: 2,
    vale: (e) => e.edad <= 28,
    crea: () => ({
      id: "stream",
      titulo: "Streamer",
      texto: "Te ofrecen hacer directos cada semana con los creadores de contenido más famosos.",
      opciones: [
        { texto: "Aceptar: los directos de madrugada molan", efecto: { media: [-2, 0], texto: "Arrasas en audiencia, pero duermes poco." } },
        { texto: "Solo alguno de vez en cuando", efecto: { media: [0, 0], texto: "Equilibrio perfecto." } },
        { texto: "Rechazarlo", efecto: { media: [0, 1], texto: "Descanso ante todo." } },
      ],
    }),
  },
  {
    id: "arabia",
    peso: 2,
    vale: (e) => e.edad >= 28 && e.media >= 80,
    crea: () => ({
      id: "arabia",
      titulo: "Llamada del Golfo",
      texto: "Un club árabe te ofrece una fortuna. Tu club no te deja salir, pero la cabeza…",
      opciones: [
        { texto: "Decir públicamente que no te mueves", efecto: { nota: 0.2, media: [0, 1], texto: "La afición te adora." } },
        { texto: "Escuchar la oferta en silencio", efecto: { media: [-1, 0], texto: "Te distrae más de lo que pensabas." } },
      ],
    }),
  },
  {
    id: "celebracion",
    peso: 1,
    vale: (e) => e.posicion !== "POR",
    crea: () => ({
      id: "celebracion",
      titulo: "Tu celebración",
      texto: "Te inventas una celebración en un partido y se hace viral.",
      opciones: [
        { texto: "Hacerla tu marca registrada", efecto: { nota: 0.1, goles: 1.05, texto: "Medio planeta la imita en el patio del colegio." } },
        { texto: "Celebrar con los compañeros, como siempre", efecto: { nota: 0.1, texto: "Lo importante es el equipo." } },
      ],
    }),
  },
  {
    id: "primer-equipo",
    peso: 6,
    vale: (e) => !!clubPorId(e.clubId)?.matriz && !e.cesion,
    crea: (e) => {
      const matriz = clubPorId(clubPorId(e.clubId)!.matriz!)!;
      return {
        id: "primer-equipo",
        titulo: "Te llama el primer equipo",
        texto: `El míster del ${matriz.nombre} te sube a entrenar con los mayores toda la pretemporada.`,
        opciones: [
          { texto: "Dejarte la piel en cada entrenamiento", efecto: { media: [1, 3], nota: 0.2, texto: "El míster apunta tu nombre en la libreta." } },
          { texto: "Ir con calma y aprender", efecto: { media: [0, 2], texto: "Aprendes de las estrellas sin agobiarte." } },
          { texto: "Pedir volver al filial para jugar", efecto: { media: [0, 1], minutos: 1.1, texto: "Juegas todo con el filial y te haces fuerte." } },
        ],
      };
    },
  },
];

export function umbralSeleccion(e: Estado): number {
  return 74 + Math.round(nacionPorCodigo(e.nacion).fuerza * 40);
}

/** El torneo de selecciones del verano que cierra la temporada, si lo hay. */
export function torneoDelVerano(e: Estado): string | null {
  const verano = e.anio + 1;
  return verano % 4 === 2 ? "Mundial" : verano % 4 === 0 ? nacionPorCodigo(e.nacion).continental : null;
}

/** Le pueden llamar (margen: cuánto por encima o por debajo del corte). */
function convocable(e: Estado, margen = 0): boolean {
  return !e.adiosSeleccion && !e.pendiente?.efecto.adiosSeleccion && e.edad >= 18 && e.media >= umbralSeleccion(e) + margen;
}

function generarEscenario(e: Estado): Escenario {
  const r = rng(e);
  // Primero los que no han salido nunca; si ya salieron todos los que
  // encajan, cualquiera menos los de los últimos 6 años.
  const encajan = ESCENARIOS.filter((g) => g.vale(e));
  const nuevos = encajan.filter((g) => !e.usados.includes(g.id));
  const recientes = e.usados.slice(-6);
  const validos = nuevos.length ? nuevos : encajan.filter((g) => !recientes.includes(g.id)).length ? encajan.filter((g) => !recientes.includes(g.id)) : encajan;
  const total = validos.reduce((s, g) => s + g.peso, 0);
  let x = r() * total;
  for (const g of validos) {
    x -= g.peso;
    if (x <= 0) return g.crea(e);
  }
  return validos[0].crea(e);
}


// ── Mitad de temporada (versión extendida) ──
const INVIERNO: Generador[] = [
  {
    id: "inv-mercado",
    peso: 3,
    vale: (e) => e.escalonClub < 5 || e.media >= 66,
    crea: () => ({
      id: "inv-mercado",
      titulo: "Mercado de invierno",
      texto: "La prensa dice que el club escucharía ofertas por ti en enero.",
      opciones: [
        { texto: "Hablar con el míster cara a cara", efecto: { nota: 0.1, texto: "Te dice que cuenta contigo y te quedas tranquilo." } },
        { texto: "Ignorar el ruido y entrenar", efecto: { media: [0, 1], texto: "Ni lo lees." } },
        { texto: "Filtrar que te quieres quedar", efecto: { nota: 0.1, texto: "La afición te lo agradece.", riesgo: { p: 0.35, media: [-1, 0], texto: "La directiva no lo lleva bien y juegas menos." } } },
      ],
    }),
  },
  {
    id: "inv-sequia",
    peso: 3,
    vale: (e) => e.posicion === "DEL" || e.posicion === "MED",
    crea: () => ({
      id: "inv-sequia",
      titulo: "Sequía en diciembre",
      texto: "Llevas un mes sin marcar ni dar una asistencia.",
      opciones: [
        { texto: "Quedarte cada día tirando a puerta", efecto: { goles: 1.15, texto: "En enero vuelves a ver puerta como nunca." } },
        { texto: "Cambiar de botas", efecto: { goles: 1.05, texto: "Botas nuevas, suerte nueva.", riesgo: { p: 0.4, media: [-1, 0], texto: "Te salen ampollas y no te encuentras." } } },
        { texto: "Hablarlo con el psicólogo", efecto: { nota: 0.2, texto: "Te quitas la presión de encima." } },
      ],
    }),
  },
  {
    id: "inv-racha",
    peso: 3,
    vale: (e) => e.media >= nivel(e),
    crea: () => ({
      id: "inv-racha",
      titulo: "Estás on fire",
      texto: "Llegas a enero siendo el mejor del equipo. El cuerpo empieza a avisar.",
      opciones: [
        { texto: "No levantar el pie: a por todas", efecto: { goles: 1.1, nota: 0.2, lesion: 0.08, texto: "Sigues enchufado toda la temporada." } },
        { texto: "Pedir alguna rotación", efecto: { minutos: 0.93, declive: 0.9, texto: "Llegas fresco a los partidos grandes." } },
      ],
    }),
  },
  {
    id: "inv-sobrecarga",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "inv-sobrecarga",
      titulo: "Sobrecarga muscular",
      texto: "Notas un pinchazo en el isquio en el entrenamiento.",
      opciones: [
        { texto: "Parar dos semanas", efecto: { minutos: 0.92, texto: "Vuelves sin molestias." } },
        { texto: "Jugar con molestias", efecto: { texto: "Aguantas como un jabato.", riesgo: { p: 0.4, media: [-2, -1], texto: "Se convierte en rotura y te pierdes dos meses." } } },
      ],
    }),
  },
  {
    id: "inv-cesion",
    peso: 4,
    vale: (e) => e.media < nivel(e) - 3 && e.escalonClub < 5 && !e.pendiente?.efecto.cedido && !e.cesion,
    crea: () => ({
      id: "inv-cesion",
      titulo: "Cesión en enero",
      texto: "Apenas juegas. Un club de menos nivel te quiere cedido hasta final de temporada.",
      opciones: [
        { texto: "Irte cedido a jugar", efecto: { cedido: true, minutos: 1.1, media: [0, 1], texto: "Te vas a jugar todos los domingos." } },
        { texto: "Quedarte a pelear el puesto", efecto: { media: [0, 1], texto: "Te quedas y aprietas en cada entrenamiento." } },
      ],
    }),
  },
  {
    id: "inv-copa",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "inv-copa",
      titulo: "Eliminatoria de copa",
      texto: "El míster quiere darte descanso en la copa, en un campo de tierra contra un modesto.",
      opciones: [
        { texto: "Pedir jugar: todos los partidos cuentan", efecto: { nota: 0.1, lesion: 0.04, texto: "Juegas y marcas la diferencia." } },
        { texto: "Aceptar el descanso", efecto: { declive: 0.95, texto: "Descansas para lo importante." } },
      ],
    }),
  },
  {
    id: "inv-champions",
    peso: 3,
    vale: (e) => e.escalonClub <= 2,
    crea: () => ({
      id: "inv-champions",
      titulo: "Octavos de Champions",
      texto: "Llegas tocado del tobillo a la ida de los octavos.",
      opciones: [
        { texto: "Infiltrarte y jugar", efecto: { nota: 0.3, texto: "Partidazo y el equipo encarrila la eliminatoria.", riesgo: { p: 0.3, media: [-2, -1], texto: "El tobillo dice basta y te pierdes la vuelta." } } },
        { texto: "Avisar al cuerpo médico", efecto: { minutos: 0.96, texto: "Te reservas para la vuelta." } },
      ],
    }),
  },
  {
    id: "inv-navidad",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "inv-navidad",
      titulo: "Parón de Navidad",
      texto: "Diez días libres en Navidad. Turrón, familia y… ¿báscula?",
      opciones: [
        { texto: "Disfrutar a tope de las fiestas", efecto: { media: [-1, 0], texto: "Vuelves feliz y con un kilo de más." } },
        { texto: "Entrenar cada mañana igualmente", efecto: { media: [0, 1], texto: "Vuelves como te fuiste." } },
      ],
    }),
  },
  {
    id: "inv-brazalete",
    peso: 2,
    vale: (e) => e.edad >= 23,
    crea: () => ({
      id: "inv-brazalete",
      titulo: "Capitán por un mes",
      texto: "Se lesiona el capitán y el míster te da el brazalete.",
      opciones: [
        { texto: "Liderar y dar la cara", efecto: { nota: 0.3, texto: "El vestuario te sigue a muerte." } },
        { texto: "Dejárselo al veterano", efecto: { media: [0, 1], texto: "Te centras en tu juego." } },
      ],
    }),
  },
  {
    id: "inv-destitucion",
    peso: 2,
    vale: () => true,
    crea: () => ({
      id: "inv-destitucion",
      titulo: "Cese del entrenador",
      texto: "Tras una mala racha, el club destituye al entrenador en enero.",
      opciones: [
        { texto: "Ganarte al nuevo desde el primer día", efecto: { media: [0, 2], minutos: 1.05, texto: "Eres de los primeros en su once." } },
        { texto: "Defender al míster en rueda de prensa", efecto: { nota: 0.1, texto: "Te ganas el respeto de todos.", riesgo: { p: 0.35, media: [-1, 0], texto: "Al nuevo no le hace gracia." } } },
      ],
    }),
  },
  {
    id: "inv-meme",
    peso: 2,
    vale: (e) => e.posicion !== "POR",
    crea: () => ({
      id: "inv-meme",
      titulo: "Eres meme",
      texto: "Fallas un gol cantado a puerta vacía y eres tendencia mundial.",
      opciones: [
        { texto: "Reírte de ti mismo en redes", efecto: { nota: 0.1, texto: "Te ganas a todo el mundo con tu humor." } },
        { texto: "Desconectar y trabajar", efecto: { media: [0, 1], texto: "El siguiente lo metes por la escuadra." } },
      ],
    }),
  },
  {
    id: "inv-portero",
    peso: 3,
    vale: (e) => e.posicion === "POR",
    crea: () => ({
      id: "inv-portero",
      titulo: "Cantada",
      texto: "Se te escapa un balón fácil entre las piernas y cuesta un punto.",
      opciones: [
        { texto: "Pedir perdón y pasar página", efecto: { nota: 0.1, texto: "La semana siguiente paras un penalti." } },
        { texto: "Analizar el vídeo una y otra vez", efecto: { media: [0, 1], texto: "Corriges el gesto y no vuelve a pasar.", riesgo: { p: 0.3, media: [-1, 0], texto: "Te obsesionas y pierdes confianza." } } },
      ],
    }),
  },
  {
    id: "inv-amistoso",
    peso: 2,
    vale: (e) => convocable(e, -2) && !torneoDelVerano(e),
    crea: () => ({
      id: "inv-amistoso",
      titulo: "Parón de marzo",
      texto: "La selección te llama para dos amistosos en la otra punta del mundo.",
      opciones: [
        { texto: "Ir: la selección es lo primero", efecto: { nota: 0.1, lesion: 0.05, texto: "Vuelves con dos partidos más en las piernas." } },
        { texto: "Pedir no ir por fatiga", efecto: { declive: 0.9, texto: "Descansas y llegas mejor al tramo final." } },
      ],
    }),
  },
  {
    id: "inv-lista-mundial",
    peso: 6,
    vale: (e) => torneoDelVerano(e) === "Mundial" && !e.adiosSeleccion && !e.pendiente?.efecto.adiosSeleccion && e.edad >= 18 && Math.abs(e.media - umbralSeleccion(e)) <= 3,
    crea: (e) => ({
      id: "inv-lista-mundial",
      titulo: "La lista del Mundial",
      texto: `Faltan cuatro meses para el Mundial y el seleccionador de ${nacionPorCodigo(e.nacion).nombre} duda entre tú y otro. Se decide en la segunda vuelta.`,
      opciones: [
        { texto: "Partirte la cara cada fin de semana", efecto: { convocatoria: 3, nota: 0.15, lesion: 0.05, texto: "No le dejas otra opción: estás en la lista." } },
        {
          texto: "Llamarle por teléfono",
          efecto: { convocatoria: 2, texto: "Le gusta tu actitud y te lo tiene en cuenta.", riesgo: { p: 0.4, media: [-1, 0], texto: "No le hace gracia la llamada." } },
        },
        { texto: "Asumir que no vas y descansar", efecto: { convocatoria: -10, declive: 0.9, texto: "Verás el Mundial desde la playa." } },
      ],
    }),
  },
  {
    id: "inv-repesca",
    peso: 5,
    vale: (e) => convocable(e) && torneoDelVerano(e) === "Mundial" && nacionPorCodigo(e.nacion).fuerza <= 0.06,
    crea: (e) => ({
      id: "inv-repesca",
      titulo: "Repesca para el Mundial",
      texto: `${nacionPorCodigo(e.nacion).nombre} se juega en marzo, en una eliminatoria a partido único, ir o no al Mundial. Tú llegas tocado.`,
      opciones: [
        { texto: "Jugarla aunque sea infiltrado", efecto: { torneo: 1.3, lesion: 0.12, texto: "Te dejas la piel en el partido más importante de tu país." } },
        { texto: "Ir al banquillo por si acaso", efecto: { torneo: 1.05, texto: "Sales en la segunda parte con el partido abierto." } },
        { texto: "Quedarte en el club recuperándote", efecto: { torneo: 0.75, declive: 0.95, texto: "Lo ves por la tele con el corazón en un puño." } },
      ],
    }),
  },
  {
    id: "inv-lesion-torneo",
    peso: 3,
    vale: (e) => convocable(e) && !!torneoDelVerano(e),
    crea: (e) => ({
      id: "inv-lesion-torneo",
      titulo: "Una lesión a destiempo",
      texto: `Notas un pinchazo en el muslo. Si te paras ahora, llegas justo a${torneoDelVerano(e) === "Mundial" ? "l Mundial" : ` la ${torneoDelVerano(e)}`}.`,
      opciones: [
        { texto: "Parar ya y llegar perfecto al verano", efecto: { minutos: 0.75, torneo: 1.1, texto: "Te pierdes un mes con el club, pero llegas como una moto." } },
        {
          texto: "Seguir jugando con el club",
          efecto: { minutos: 1.05, nota: 0.1, texto: "Aguantas el dolor y no se rompe nada.", riesgo: { p: 0.35, media: [-2, -1], texto: "Se rompe del todo: llegas al verano a medio gas." } },
        },
      ],
    }),
  },
  {
    id: "inv-tarjeta",
    peso: 2,
    vale: (e) => e.posicion === "DEF" || e.posicion === "MED",
    crea: () => ({
      id: "inv-tarjeta",
      titulo: "Apercibido",
      texto: "Estás a una amarilla de perderte el partido más importante del año.",
      opciones: [
        { texto: "Forzar la amarilla en el partido de antes", efecto: { nota: 0.1, texto: "Cumples ciclo y llegas limpio al partidazo.", riesgo: { p: 0.3, media: [-1, 0], texto: "Te pillan y Competición te sanciona el doble." } } },
        { texto: "Jugar sin pensar en ello", efecto: { media: [0, 1], texto: "Juegas con la cabeza y no ves la amarilla." } },
      ],
    }),
  },
];

function generarInvierno(e: Estado): Escenario {
  const r = rng(e);
  const encajan = INVIERNO.filter((g) => g.vale(e));
  const nuevos = encajan.filter((g) => !e.usados.includes(g.id));
  const recientes = e.usados.slice(-8);
  const validos = nuevos.length ? nuevos : encajan.filter((g) => !recientes.includes(g.id)).length ? encajan.filter((g) => !recientes.includes(g.id)) : encajan;
  const total = validos.reduce((s, g) => s + g.peso, 0);
  let x = r() * total;
  for (const g of validos) {
    x -= g.peso;
    if (x <= 0) return { ...g.crea(e), mitad: true };
  }
  return { ...validos[0].crea(e), mitad: true };
}

/** Dos decisiones de la misma temporada en una. */
function combinar(a: Efecto, b: Efecto): Efecto {
  return {
    texto: b.texto,
    minutos: (a.minutos ?? 1) * (b.minutos ?? 1),
    goles: (a.goles ?? 1) * (b.goles ?? 1),
    lesion: (a.lesion ?? 0) + (b.lesion ?? 0),
    cedido: a.cedido || b.cedido,
    declive: (a.declive ?? 1) * (b.declive ?? 1),
    nota: (a.nota ?? 0) + (b.nota ?? 0),
    torneo: (a.torneo ?? 1) * (b.torneo ?? 1),
    convocatoria: (a.convocatoria ?? 0) + (b.convocatoria ?? 0),
    adiosSeleccion: a.adiosSeleccion || b.adiosSeleccion,
  };
}

// ── Crear ──
export function crearCarrera(o: {
  nombre: string;
  nacion: string;
  posicion: Posicion;
  clubId: number;
  semilla: number;
  extendido?: boolean;
  edad?: number;
}): Estado {
  const club = clubPorId(o.clubId);
  const edad = (EDADES_INICIO as readonly number[]).includes(o.edad ?? EDAD_INICIO) ? (o.edad ?? EDAD_INICIO) : EDAD_INICIO;
  const base: Estado = {
    v: 1,
    semilla: o.semilla,
    paso: 0,
    nombre: o.nombre.trim().slice(0, 30) || "El Crack",
    nacion: o.nacion,
    posicion: o.posicion,
    edad,
    anio: ANIO_INICIO,
    clubId: o.clubId,
    escalonClub: club?.escalon ?? 5,
    media: 0,
    potencial: 0,
    fase: "escenario",
    escenario: null,
    usados: [],
    extendido: !!o.extendido,
    pendiente: null,
    cesion: null,
    ofertas: [],
    historial: [],
  };
  const r = rng(base);
  // Cada año menos, 3 puntos menos de media (a los 17, entre 58 y 63).
  const menos = 3 * (EDAD_INICIO - edad);
  base.media = entre(r, [58 - menos, 63 - menos]);
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

export type Tramo = { partidos: number; goles: number; asistencias: number; porteriasCero: number; lesionado: boolean };

/** Una parte de la temporada (toda, o media en la versión extendida). */
function jugarTramo(e: Estado, media: number, escalonJuego: Escalon, ef: Efecto, fraccion: number, r: () => number): Tramo {
  const diff = media - NIVEL_ESCALON[escalonJuego];
  const lesionado = r() < ((ef.lesion ?? 0) + 0.06) * fraccion;
  const titular = limitar(0.5 + diff * 0.08, 0.05, 0.97) * (ef.minutos ?? 1);
  const max = MAX_PARTIDOS[escalonJuego] * fraccion;
  const partidos = Math.round(limitar(max * titular * (lesionado ? 0.55 : 1) * (0.9 + r() * 0.2), 0, max));
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
  return { partidos, goles, asistencias, porteriasCero, lesionado };
}

/** Nota de lo jugado (null con menos de `minimo` partidos). */
const PARTIDOS_RONDA: Record<Ronda, number> = { "sin clasificar": 0, grupos: 3, octavos: 4, cuartos: 5, semifinales: 6, final: 7, campeon: 7 };

/** El Mundial o el torneo continental: clasificarse, pasar rondas y, quizá, ganarlo. */
function jugarTorneo(e: Estado, media: number, factor: number, r: () => number): Ronda {
  const n = nacionPorCodigo(e.nacion);
  if (r() > limitar((0.72 + n.fuerza * 3) * Math.sqrt(factor), 0.4, 0.98)) return "sin clasificar";
  // Cada eliminatoria es un partido: una favorita gana el torneo ~1 de cada 4 veces.
  const grupos = limitar((0.55 + n.fuerza * 2 + (media - 82) * 0.01) * factor, 0.4, 0.97);
  const ronda = limitar((0.4 + n.fuerza * 1.4 + (media - 82) * 0.008) * Math.sqrt(factor), 0.3, 0.8);
  const orden: Ronda[] = ["grupos", "octavos", "cuartos", "semifinales", "final", "campeon"];
  let i = 0;
  while (i < orden.length - 1 && r() < (i === 0 ? grupos : ronda)) i++;
  return orden[i];
}

function notaDe(e: Estado, t: Tramo, media: number, escalonJuego: Escalon, extra: number, r: () => number, minimo = 8): number | null {
  const diff = media - NIVEL_ESCALON[escalonJuego];
  const aporte =
    e.posicion === "DEL"
      ? (t.goles / Math.max(t.partidos, 1)) * 1.6
      : e.posicion === "MED"
        ? ((t.goles + t.asistencias) / Math.max(t.partidos, 1)) * 1.3
        : (t.porteriasCero / Math.max(t.partidos, 1)) * 1.2;
  return t.partidos < minimo ? null : Math.round(limitar(6 + diff * 0.07 + aporte + (r() * 0.8 - 0.4) + extra, 5, 9.6) * 10) / 10;
}

const cesionPara = (e: Estado, r: () => number) =>
  elegirDe(r, CLUBES_FICHAN.filter((c) => c.escalon === Math.min(5, e.escalonClub + 1) && c.id !== e.clubId)).id;

/** Elegir una opción del escenario: aplica su efecto y juega la temporada. */
export function elegirOpcion(e: Estado, i: number): Estado {
  if (e.fase !== "escenario" || !e.escenario) return e;
  const opcion = e.escenario.opciones[i];
  if (!opcion) return e;
  const r = rng(e);
  const efOpcion = opcion.efecto;
  let deltaOpcion = efOpcion.media ? entre(r, efOpcion.media) : 0;
  let resultadoOpcion = efOpcion.texto;
  if (efOpcion.riesgo && r() < efOpcion.riesgo.p) {
    deltaOpcion = entre(r, efOpcion.riesgo.media);
    resultadoOpcion = efOpcion.riesgo.texto;
  }
  const trofeoOpcion = efOpcion.trofeo && r() < efOpcion.trofeo.p ? efOpcion.trofeo.nombre : null;

  // Versión extendida: la de pretemporada espera a la de mitad de temporada.
  // Se juega la primera vuelta y se ve antes de decidir.
  if (e.extendido && !e.escenario.mitad) {
    const cedidoPre = e.cesion ?? (efOpcion.cedido ? cesionPara(e, r) : undefined);
    const escalonPre = cedidoPre ? clubPorId(cedidoPre)!.escalon : e.escalonClub;
    const media1 = limitar(e.media + deltaOpcion, 40, 97);
    const tramo1 = jugarTramo(e, media1, escalonPre, efOpcion, 0.5, r);
    const siguiente: Estado = {
      ...e,
      paso: e.paso + 1,
      pendiente: {
        id: e.escenario.id,
        efecto: efOpcion,
        delta: deltaOpcion,
        eleccion: opcion.texto,
        resultado: resultadoOpcion,
        trofeo: trofeoOpcion,
        cedidoEn: cedidoPre,
        primeraMitad: { ...tramo1, media: media1, nota: notaDe(e, tramo1, media1, escalonPre, efOpcion.nota ?? 0, r, 4) },
      },
    };
    return { ...siguiente, escenario: generarInvierno(siguiente) };
  }
  const previa = e.escenario.mitad ? e.pendiente : null;
  const ef = previa ? combinar(previa.efecto, efOpcion) : efOpcion;
  const delta = (previa?.delta ?? 0) + deltaOpcion;
  const mediaInicio = e.media;
  const media = limitar(e.media + delta, 40, 97);
  const trofeosEscenario = [previa?.trofeo, trofeoOpcion].filter((t): t is string => !!t);

  // Club donde se juega (cedido: uno de un escalón menos).
  const clubPropio = clubPorId(e.clubId)!;
  // Cedido: desde pretemporada (toda la temporada) o en enero (la segunda vuelta).
  const cedidoEn = e.cesion ?? previa?.cedidoEn ?? (efOpcion.cedido || (!previa && ef.cedido) ? cesionPara(e, r) : undefined);
  const escalonJuego = cedidoEn ? clubPorId(cedidoEn)!.escalon : e.escalonClub;
  const clubJuego = cedidoEn ? clubPorId(cedidoEn)! : clubPropio;
  const liga = cedidoEn ? clubJuego.liga : ligaActual(clubPropio, e.escalonClub);

  // La temporada entera, o la segunda vuelta sumada a la primera.
  const tramo = jugarTramo(e, media, escalonJuego, ef, previa ? 0.5 : 1, r);
  const ida = previa?.primeraMitad;
  const partidos = tramo.partidos + (ida?.partidos ?? 0);
  const goles = tramo.goles + (ida?.goles ?? 0);
  const asistencias = tramo.asistencias + (ida?.asistencias ?? 0);
  const porteriasCero = tramo.porteriasCero + (ida?.porteriasCero ?? 0);
  const lesionado = tramo.lesionado || !!ida?.lesionado;
  const nota = notaDe(e, { partidos, goles, asistencias, porteriasCero, lesionado }, media, escalonJuego, ef.nota ?? 0, r);

  // Trofeos del equipo: el escalón manda y tu temporada ayuda.
  const impacto = nota != null ? (nota - 6.5) * 0.25 * (partidos / MAX_PARTIDOS[escalonJuego]) : 0;
  const trofeos: string[] = [...trofeosEscenario];
  let escalonClub = e.escalonClub;
  const dominante = liga === "Liga Portugal" || liga === "Eredivisie";
  const pLiga = { 1: 0.32, 2: 0.1, 3: dominante ? 0.33 : 0.03, 4: 0.005, 5: 0.12 }[escalonJuego] + impacto * 0.3;
  if (escalonJuego === 5) {
    if (r() < pLiga) trofeos.push(`Campeón de ${liga}`);
    // Una cantera no asciende: su primer equipo ya está arriba.
    if (!clubJuego.matriz && (trofeos.length || r() < 0.22 + impacto * 0.4)) {
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
  if (!e.adiosSeleccion && !ef.adiosSeleccion && media + (ef.convocatoria ?? 0) >= umbralSeleccion({ ...e, media }) && e.edad >= 18) {
    const pj = 4 + Math.round(r() * 6);
    const porGol = Math.max(0, { POR: 0, DEF: 0.02 + (media - 60) * 0.002, MED: 0.08 + (media - 60) * 0.007, DEL: 0.22 + (media - 60) * 0.014 }[e.posicion]);
    const g = Math.round(pj * porGol * (0.6 + r() * 0.6));
    seleccion = { partidos: pj, goles: g };
    // El torneo del verano: hasta dónde llegáis y tus goles en él.
    const torneo = torneoDelVerano(e);
    if (torneo) {
      const ronda = jugarTorneo(e, media, ef.torneo ?? 1, r);
      const tpj = PARTIDOS_RONDA[ronda];
      const tg = Math.round(tpj * porGol * (0.5 + r() * 0.9));
      seleccion = { partidos: pj + tpj, goles: g + tg, torneo: { nombre: `${torneo} ${e.anio + 1}`, ronda, partidos: tpj, goles: tg } };
      if (ronda === "campeon") trofeos.push(`${torneo} ${e.anio + 1} con ${nacion.nombre}`);
    }
  }

  // Premios individuales (con una temporada de verdad).
  const premios: string[] = [];
  let balonPuesto: number | undefined;
  if (nota != null && partidos >= 20) {
    if (e.edad <= 21 && media >= 78 && nota >= 7.2 && r() < 0.6) premios.push("Golden Boy");
    if (e.edad <= 21 && media >= 80 && nota >= 7.3 && r() < 0.45) premios.push("Trofeo Kopa");
    if (e.edad <= 22 && nota >= 7.3 && escalonJuego <= 4 && r() < 0.5) premios.push(`Mejor jugador joven de ${liga}`);
    if (nota >= 7.4 && r() < 0.45) premios.push(`Mejor jugador del ${clubJuego.nombre}`);
    if ((e.posicion === "DEL" || e.posicion === "MED") && goles >= 8 && r() < 0.02) premios.push("Premio Puskás");
    if (e.posicion === "POR" && media >= 82 && porteriasCero >= 15 && escalonJuego <= 4 && r() < 0.45)
      premios.push(liga === "LaLiga" ? "Trofeo Zamora" : `Mejor portero de ${liga}`);
    if (trofeos.includes("Champions League") && nota >= 7.3) {
      if (r() < 0.3) premios.push("MVP de la final de la Champions");
      if (nota >= 7.6 && r() < 0.45) premios.push("Mejor jugador de la Champions");
    }
    const torneo = seleccion?.torneo;
    const esMundial = !!torneo?.nombre.startsWith("Mundial");
    if (esMundial && ["semifinales", "final", "campeon"].includes(torneo!.ronda) && nota >= 7.4 && r() < (torneo!.ronda === "campeon" ? 0.35 : 0.12))
      premios.push("Balón de Oro del Mundial");
    if (torneo && torneo.goles >= (esMundial ? 5 : 4) && r() < 0.5)
      premios.push(esMundial ? "Bota de Oro del Mundial" : `Máximo goleador de la ${torneo.nombre.replace(/ \d+$/, "")}`);
    const golesLiga = goles * 0.72;
    if (e.posicion === "DEL" && golesLiga >= 30 && r() < 0.7) premios.push("Bota de Oro");
    else if (e.posicion === "DEL" && golesLiga >= 21 && escalonJuego <= 4 && r() < 0.6) premios.push(`Máximo goleador de ${liga}`);
    if (e.posicion === "POR" && media >= 86 && porteriasCero >= 18 && r() < 0.5) premios.push("Trofeo Yashin");
    if (nota >= 7.8 && escalonJuego <= 4 && r() < 0.5) premios.push(`Mejor jugador de ${liga}`);
    if (media >= 88 && nota >= 7.4 && r() < 0.6) premios.push("Once del año FIFA");
    const grande = trofeos.some((t) => t === "Champions League" || /^Mundial \d/.test(t));
    const pBalon = limitar(0.1 + (media - 88) * 0.1 + (nota - 7.5) * 0.35 + (grande ? 0.25 : 0), 0, 0.75);
    // A porteros y defensas casi nunca se lo dan.
    const factor = e.posicion === "POR" || e.posicion === "DEF" ? 0.3 : 1;
    if (media >= 88 && nota >= 7.4 && escalonJuego <= 2 && r() < pBalon * factor) premios.push("Balón de Oro");
    if (media >= 87 && nota >= 7.3 && escalonJuego <= 2 && r() < pBalon * factor * 0.9) premios.push("The Best FIFA");

    // La votación del Balón de Oro: entre los 30 si estás a gran nivel.
    if (premios.includes("Balón de Oro")) balonPuesto = 1;
    else if (media >= 82 && escalonJuego <= 3) {
      const peso =
        media +
        (nota - 7) * 5 +
        (trofeos.includes("Champions League") ? 4 : 0) +
        (trofeos.some((t) => /^Mundial \d/.test(t)) ? 5 : 0) +
        (trofeos.includes(liga) ? 1.5 : 0) +
        (e.posicion === "DEL" ? goles / 12 : 0) -
        (e.posicion === "POR" || e.posicion === "DEF" ? 3 : 0);
      const puesto = Math.round(limitar(2 + (96 - peso) * 1.7 + (r() * 4 - 2), 2, 40));
      if (puesto <= 30) balonPuesto = puesto;
    }
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
    balonPuesto,
    eleccion: previa ? previa.eleccion : opcion.texto,
    resultadoEleccion: previa ? previa.resultado : resultadoOpcion,
    invierno: previa ? { eleccion: opcion.texto, resultado: resultadoOpcion } : undefined,
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
    usados: [...e.usados, ...(previa ? [previa.id] : []), e.escenario.id],
    adiosSeleccion: e.adiosSeleccion || ef.adiosSeleccion || undefined,
    pendiente: null,
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
/**
 * Media con la que el primer equipo sube a un canterano (con una temporada de
 * 6,5). A un grande se sube como promesa (10 por debajo de su nivel); a uno
 * más modesto hay que llegar casi hecho. 30-oct: con 8, en la cantera del
 * Barça o del Madrid media carrera se iba sin que llamase nunca.
 */
export const mediaParaSubir = (escalonMatriz: Escalon) => NIVEL_ESCALON[escalonMatriz] - (escalonMatriz <= 2 ? 10 : 4);

/** Tras ver la temporada: ofertas según el rendimiento (o el final). */
export function pasarAOfertas(e: Estado): Estado {
  if (e.fase !== "resultado") return e;
  if (e.edad + 1 >= EDAD_RETIRO) return { ...e, fase: "fin" };
  const r = rng(e);
  const t = e.historial[e.historial.length - 1];
  const rendimiento = t.nota ?? 5.5;
  const ofertas: number[] = [];
  const otros = (escalon: Escalon) => CLUBES_FICHAN.filter((c) => c.escalon === escalon && c.id !== e.clubId);

  // Muy por debajo del nivel del club: no te renueva y solo llaman los de un
  // escalón menos (si no, acababas a los 38 en el Madrid jugando 3 partidos).
  if (e.media < nivel(e) - 6 && rendimiento < 6.5 && e.escalonClub < 5 && e.edad >= 22) {
    const abajo = otros((e.escalonClub + 1) as Escalon);
    const a = elegirDe(r, abajo);
    const b = elegirDe(r, abajo.filter((c) => c.id !== a.id));
    return { ...e, paso: e.paso + 1, fase: "ofertas", sinRenovar: true, finFilial: false, ofertas: [a.id, b.id], cesiones: [] };
  }

  // Cantera: si destacas, sube al primer equipo (28-oct).
  const club = clubPorId(e.clubId);
  const matriz = club?.matriz ? clubPorId(club.matriz) : null;
  // El último verano en el filial el club decide: o te sube o te deja ir.
  const ultimoVerano = !!matriz && e.edad + 1 >= 24;
  if (
    matriz &&
    ((e.media >= mediaParaSubir(matriz.escalon) && rendimiento >= 6.5) ||
      (ultimoVerano && e.media >= NIVEL_ESCALON[matriz.escalon] - 12))
  )
    ofertas.push(matriz.id);

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
  // Filial: con 24 años hay que salir (al primer equipo o a otro club).
  if (ultimoVerano) {
    while (ofertas.length < 2) {
      const extra = elegirDe(r, otros(e.escalonClub).filter((c) => !ofertas.includes(c.id)));
      ofertas.push(extra.id);
    }
    return { ...e, paso: e.paso + 1, fase: "ofertas", sinRenovar: true, finFilial: true, ofertas: [...new Set(ofertas)], cesiones: [] };
  }

  // Cesión de una temporada: para los jóvenes que no juegan o no rinden.
  const cesiones: number[] = [];
  const pocoJuego = t.partidos < MAX_PARTIDOS[e.escalonClub] * 0.55 || e.media < nivel(e);
  if (e.edad + 1 <= 24 && pocoJuego) {
    const destino = Math.min(5, e.escalonClub + 1) as Escalon;
    const lista = otros(destino).filter((c) => !ofertas.includes(c.id));
    const a = elegirDe(r, lista);
    cesiones.push(a.id);
    const b = elegirDe(r, lista.filter((c) => c.id !== a.id));
    if (b && r() < 0.5) cesiones.push(b.id);
  }
  return { ...e, paso: e.paso + 1, fase: "ofertas", sinRenovar: false, finFilial: false, ofertas: [...new Set(ofertas)], cesiones };
}

/** ¿Toca preguntar por la retirada? (cumple 34 o más) */
export const puedeRetirarse = (e: Estado) => e.edad + 1 >= EDAD_PREGUNTA_RETIRO;

/** Decidir: seguir (null), fichar por un club ofrecido, o retirarse. */
export function decidir(
  e: Estado,
  decision: { tipo: "seguir" } | { tipo: "fichar"; clubId: number } | { tipo: "ceder"; clubId: number } | { tipo: "retirarse" },
): Estado {
  if (e.fase !== "ofertas") return e;
  if (decision.tipo === "retirarse") {
    if (!puedeRetirarse(e)) return e;
    return { ...e, fase: "fin" };
  }
  if (decision.tipo === "seguir" && e.sinRenovar) return e;
  if (decision.tipo === "fichar" && !e.ofertas.includes(decision.clubId)) return e;
  if (decision.tipo === "ceder" && !(e.cesiones ?? []).includes(decision.clubId)) return e;
  let clubId = e.clubId;
  let escalonClub = e.escalonClub;
  if (decision.tipo === "fichar" && e.ofertas.includes(decision.clubId)) {
    clubId = decision.clubId;
    escalonClub = clubPorId(clubId)!.escalon;
  }
  const siguiente: Estado = {
    ...e,
    clubId,
    escalonClub,
    edad: e.edad + 1,
    anio: e.anio + 1,
    fase: "escenario",
    ofertas: [],
    cesiones: [],
    cesion: decision.tipo === "ceder" ? decision.clubId : null,
  };
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
  /** Mejor puesto en la votación del Balón de Oro. */
  mejorBalon: number | null;
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
  const mundiales = trofeos.filter((t) => /^Mundial \d/.test(t)).length;
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
    mejorBalon: h.some((t) => t.balonPuesto) ? Math.min(...h.filter((t) => t.balonPuesto).map((t) => t.balonPuesto!)) : null,
    legado,
    titulo,
  };
}
