/**
 * Texto de «Cómo se juega» bajo cada juego (13-nov-2026).
 *
 * Por qué existe: AdSense rechazó la web por «contenido de poco valor» y las
 * páginas de juegos eran casi solo botones. Esto es texto propio, en el HTML
 * del servidor, que explica las reglas, los puntos y de dónde salen los
 * datos. Si cambian las reglas o la puntuación (`niveles.ts`), cambiar
 * también aquí: el texto tiene que decir la verdad.
 */

export type Explicacion = {
  /** Cómo se juega, paso a paso. */
  pasos: string[];
  /** Cómo se puntúa. */
  puntos: string;
  /** De dónde salen los jugadores, equipos o datos. */
  datos: string;
  /** Un consejo del dueño para jugar mejor. */
  consejo?: string;
};

const NIVELES =
  "Antes de empezar eliges nivel: Fácil (2:00 de reloj), Medio (1:30, puntos ×1,5) o Difícil (1:00, puntos ×2).";

const DIARIO =
  "Hay un reto del día, el mismo para todo el mundo y con puntos para el ranking, y un modo práctica para jugar todas las veces que quieras sin que cuente.";

export const EXPLICACIONES: Record<string, Explicacion> = {
  "adivina-el-equipo": {
    pasos: [
      "Ves un once que hizo historia colocado en el campo, pero en vez de nombres solo aparecen las banderas de los jugadores.",
      "Escribe el equipo que crees que es. Tienes cinco intentos.",
      "Cada fallo te da una pista nueva: la liga, la temporada, un partido de ese año y el nombre de uno de los jugadores.",
      DIARIO,
    ],
    puntos: `100 puntos por acertar, 15 menos por cada fallo y uno más por cada segundo que te sobre. ${NIVELES}`,
    datos:
      "Los onces están elegidos a mano: equipos que se recuerdan, campeones y plantillas que marcaron una época en LaLiga, la Premier, la Serie A, la Ligue 1 y la Bundesliga. En fácil salen solo de LaLiga y la Premier; en difícil entran todas.",
    consejo:
      "Fíjate en la mezcla de banderas: un once con cuatro holandeses en los noventa tiene pocos candidatos.",
  },
  "adivina-el-jugador": {
    pasos: [
      "Te enseñamos los clubes por los que pasó un futbolista, en orden, de su primer equipo al último.",
      "Escribe su nombre: el buscador te propone jugadores mientras tecleas. Tienes cinco intentos.",
      "Cada fallo destapa una pista: la posición, el país, el año de nacimiento y las iniciales.",
      DIARIO,
    ],
    puntos: `100 puntos por acertar, 15 menos por cada fallo y uno más por cada segundo que te sobre. ${NIVELES}`,
    datos:
      "Las carreras están escritas a mano, club a club, con cracks de las grandes ligas de las últimas décadas. La API de datos se deja temporadas enteras de los jugadores antiguos, así que no la usamos para esto.",
    consejo: "Los cedidos cuentan: un club pequeño en medio de la carrera suele ser la pista que lo delata.",
  },
  "tiki-taka-toe": {
    pasos: [
      "Un tablero de tres por tres con un club en cada fila y otro en cada columna.",
      "En cada casilla hay que poner un jugador que haya pasado por los dos clubes: el de su fila y el de su columna.",
      "Tienes nueve intentos para rellenar las nueve casillas. Un jugador no vale para dos casillas.",
      "El tablero cambia cada día; en práctica sale uno nuevo cuando quieras.",
    ],
    puntos: `15 puntos por casilla, 40 de premio si completas el tablero y uno más por segundo que sobre si lo completas. ${NIVELES}`,
    datos:
      "Salen de las mismas carreras escritas a mano que «Adivina el jugador»: cerca de un centenar de futbolistas y casi doscientos clubes comprobados.",
    consejo: "Empieza por la casilla más difícil: las fáciles se quedan con muchas opciones para el final.",
  },
  "once-de-leyenda": {
    pasos: [
      "Once rondas, una por puesto: portero, defensas, centrocampistas y delanteros.",
      "En cada ronda te salen tres leyendas y eliges una para tu once.",
      "Las medias no se ven hasta el final: entonces descubres la media de tu equipo y si elegiste al mejor de cada terna.",
    ],
    puntos: `12 puntos cada vez que eliges al mejor de los tres, y uno más por segundo que sobre al terminar. ${NIVELES}`,
    datos:
      "Las leyendas y sus medias las puse yo, a mano: Messi, Cruyff, Maldini, Zidane y compañía. Se pueden discutir, y de eso va el juego.",
  },
  "mas-o-menos": {
    pasos: [
      "Dos jugadores de las grandes ligas y una pregunta: ¿quién tiene más goles (o más asistencias) esta temporada en su liga?",
      "Si aciertas, suma uno a tu racha y sale otra pareja. Si fallas, se acaba.",
      "Juegas contra el reloj: suma toda la racha que puedas antes de que se acabe el tiempo.",
    ],
    puntos: `10 puntos por cada acierto de la racha. ${NIVELES}`,
    datos:
      "Las cifras son las de la temporada en curso, sacadas de las tablas de goleadores y asistentes de cada liga, las mismas que ves en las fichas de la web.",
  },
  "top-10": {
    pasos: [
      "Te damos un equipo, una temporada y una lista: los diez jugadores con más minutos, más goles o más asistencias.",
      "Solo ves la bandera de cada uno. Escribe nombres y, si está en la lista, aparece en su puesto.",
      "Vale el apellido o el nombre por el que se le conoce. No hace falta escribir tildes.",
    ],
    puntos:
      "10 puntos por nombre, 40 de premio si sacas los diez y uno más por segundo que sobre si los sacas todos. Hay más tiempo que en los otros juegos: 3:00 en Fácil, 2:15 en Medio (×1,5) y 1:30 en Difícil (×2).",
    datos:
      "Temporadas de los grandes de LaLiga, la Premier y la Champions. Las cifras son de liga más Champions, comprobadas una a una: si los goles de la lista no cuadran con los del equipo, esa lista no entra. Las asistencias solo existen desde 2015.",
    consejo: "Empieza por los minutos: el portero titular y los centrales casi siempre están.",
  },
  ahorcado: {
    pasos: [
      "Un futbolista de hoy. Sabes en qué liga juega y ves una raya por cada letra de su apellido. El equipo, al final.",
      "Pide letras con el teclado. Las tildes no importan: la A vale para la Á.",
      "Cada fallo dibuja una parte del muñeco: cabeza y cuerpo, una pierna, la otra, un brazo y el otro. Al quinto fallo, ahorcado.",
      DIARIO,
    ],
    puntos: `100 puntos por acertar, 15 menos por cada fallo y uno más por cada segundo que te sobre. ${NIVELES}`,
    datos:
      "Jugadores de esta temporada en los grandes de LaLiga, la Premier y los habituales de la Champions. Solo entran los que juegan de verdad (más de 300 minutos en liga), para que no salgan desconocidos.",
    consejo: "Empieza por las vocales y luego la R, la N y la S: son las que más se repiten en los apellidos.",
  },
  "futbolista-misterioso": {
    pasos: [
      "Hay un futbolista escondido. Escribe el nombre de cualquier jugador para empezar.",
      "Te decimos en qué se parece al misterioso: liga, equipo, posición, país, edad y dorsal.",
      "Verde si coincide; amarillo si está cerca (edad a dos años o dorsal a tres), con una flecha que dice si es mayor o menor.",
      "Tienes ocho intentos.",
    ],
    puntos: `100 puntos por acertar, 10 menos por cada fallo y uno más por cada segundo que te sobre. ${NIVELES}`,
    datos:
      "Los mismos jugadores que el Ahorcado: los que juegan esta temporada en los grandes de LaLiga, la Premier y la Champions, con su edad y su dorsal actuales.",
    consejo: "Elige primero un jugador de una liga y una posición distintas: descartar es tan útil como acertar.",
  },
  "escudo-borroso": {
    pasos: [
      "Ves un escudo muy borroso y en blanco y negro.",
      "Escribe el equipo. Con cada fallo el escudo se aclara un poco; al tercer fallo recupera el color y te decimos la liga.",
      "Tienes seis intentos.",
      DIARIO,
    ],
    puntos: `100 puntos por acertar, 10 menos por cada fallo y uno más por cada segundo que te sobre. ${NIVELES}`,
    datos:
      "Equipos de las cinco grandes ligas de Europa: LaLiga, la Premier, la Serie A, la Ligue 1 y la Bundesliga. Son los mismos clubes que en «Adivina el equipo».",
  },
  "foto-oculta": {
    pasos: [
      "La foto de un futbolista de hoy, tapada por nueve trozos. Empieza con uno destapado.",
      "Escribe quién crees que es. Cada fallo destapa otro trozo; la cara es lo último que se ve.",
      "Al segundo fallo te decimos la liga y al cuarto, el equipo. Tienes seis intentos.",
      DIARIO,
    ],
    puntos: `100 puntos por acertar, 10 menos por cada fallo y uno más por cada segundo que te sobre. ${NIVELES}`,
    datos:
      "Jugadores de esta temporada en los grandes de LaLiga, la Premier y la Champions. Solo entran los que tienen foto oficial de verdad, no la silueta genérica.",
  },
  "agrupa-los-cuatro": {
    pasos: [
      "Dieciséis nombres del fútbol que hay que separar en cuatro grupos de cuatro.",
      "Elige cuatro que creas que tienen algo en común y pulsa «Comprobar».",
      "Si aciertas, el grupo se queda arriba con su color y su explicación. Si fallas, cuenta un error; si eran tres de cuatro, te avisamos.",
      "Con cuatro errores se acaba y ves la solución.",
    ],
    puntos:
      "25 puntos por grupo, 5 menos por error y uno más por segundo que sobre si sacas los cuatro. Tiempo: 3:00 en Fácil, 2:15 en Medio (×1,5) y 1:30 en Difícil (×2).",
    datos:
      "Los paneles los hago yo a mano. Siempre hay una trampa: algún nombre que parece encajar en dos grupos y solo va en uno.",
    consejo: "Busca primero el grupo más raro: los obvios suelen tener un intruso.",
  },
  cronologia: {
    pasos: [
      "Cinco momentos de la historia del fútbol: finales, fichajes, récords, Mundiales…",
      "Ordénalos del más antiguo (arriba) al más reciente (abajo).",
      "Tienes tres intentos. Después de cada uno te marcamos los que ya están en su sitio.",
      DIARIO,
    ],
    puntos: `100 puntos si lo clavas a la primera, 70 a la segunda y 40 a la tercera, más uno por segundo que sobre. ${NIVELES}`,
    datos:
      "Los momentos están escritos y fechados a mano. En cada partida los cinco son de años distintos, para que siempre haya un orden correcto.",
  },
  "adivina-el-once": {
    pasos: [
      "Antes de cada partido del Barça, eliges los once titulares que crees que pondrá el entrenador, y la formación.",
      "Se puede cambiar hasta una hora antes del partido, cuando sale la alineación oficial.",
      "Cuando se publica el once real, se comparan los dos y se suman los puntos.",
    ],
    puntos:
      "Un punto por cada titular que aciertes, otro si clavas la formación y tres más de premio si haces pleno. Los puntos de toda la temporada forman una clasificación.",
    datos:
      "La plantilla es la del Barça de esta temporada y el once real es la alineación oficial que se publica antes de cada partido.",
  },
};
