/**
 * «Agrupa los cuatro» (10-nov-2026, pedido del dueño): 16 nombres que hay
 * que separar en 4 grupos de 4. Paneles curados a mano.
 *
 * Reglas al escribir uno nuevo:
 * - Solo hechos seguros (comprobados), nada discutible.
 * - Ningún nombre puede encajar en dos grupos del mismo panel: por eso, por
 *   ejemplo, Ancelotti no está en «entrenadores del Real Madrid» del panel
 *   de entrenadores (también es italiano) ni Del Bosque en «campeones del
 *   mundo» (también entrenó al Madrid).
 * - `nivel` va de 0 (el más fácil) a 3 (el más difícil): da el color.
 */

export type Grupo = { titulo: string; nivel: 0 | 1 | 2 | 3; nombres: [string, string, string, string] };
export type Panel = { id: string; grupos: [Grupo, Grupo, Grupo, Grupo] };

export const MAX_ERRORES_AGRUPA = 4;

export const PANELES: Panel[] = [
  {
    id: "balon-de-oro",
    grupos: [
      { titulo: "Porteros campeones del mundo", nivel: 0, nombres: ["Iker Casillas", "Gianluigi Buffon", "Hugo Lloris", "Emiliano Martínez"] },
      { titulo: "Delanteros uruguayos", nivel: 1, nombres: ["Luis Suárez", "Edinson Cavani", "Diego Forlán", "Darwin Núñez"] },
      { titulo: "Ganaron el Balón de Oro", nivel: 2, nombres: ["Luka Modrić", "Karim Benzema", "Rodri", "Kaká"] },
      { titulo: "Jugaron en el Barça y en el Real Madrid", nivel: 3, nombres: ["Luís Figo", "Luis Enrique", "Michael Laudrup", "Samuel Eto'o"] },
    ],
  },
  {
    id: "mundiales",
    grupos: [
      { titulo: "Campeones del mundo con Argentina en 2022", nivel: 0, nombres: ["Lionel Messi", "Ángel Di María", "Julián Álvarez", "Enzo Fernández"] },
      { titulo: "Campeones del mundo con Francia en 2018", nivel: 1, nombres: ["Antoine Griezmann", "Kylian Mbappé", "Paul Pogba", "N'Golo Kanté"] },
      { titulo: "Ingleses que jugaron en el Real Madrid", nivel: 2, nombres: ["David Beckham", "Michael Owen", "Jude Bellingham", "Steve McManaman"] },
      { titulo: "Han entrenado al Barça", nivel: 3, nombres: ["Pep Guardiola", "Xavi Hernández", "Ronald Koeman", "Hansi Flick"] },
    ],
  },
  {
    id: "campeones-2010-2014",
    grupos: [
      { titulo: "Campeones del mundo con España en 2010", nivel: 0, nombres: ["Carles Puyol", "Andrés Iniesta", "David Villa", "Xabi Alonso"] },
      { titulo: "Campeones del mundo con Alemania en 2014", nivel: 1, nombres: ["Manuel Neuer", "Philipp Lahm", "Thomas Müller", "Toni Kroos"] },
      { titulo: "Brasileños que jugaron en el Barça", nivel: 2, nombres: ["Ronaldinho", "Neymar", "Rivaldo", "Dani Alves"] },
      { titulo: "Leyendas del Milan", nivel: 3, nombres: ["Paolo Maldini", "Franco Baresi", "Andriy Shevchenko", "Andrea Pirlo"] },
    ],
  },
  {
    id: "madrid-y-atleti",
    grupos: [
      { titulo: "Portugueses", nivel: 0, nombres: ["Cristiano Ronaldo", "Luís Figo", "Bernardo Silva", "Bruno Fernandes"] },
      { titulo: "Campeones de Europa con el Liverpool en 2019", nivel: 1, nombres: ["Mohamed Salah", "Virgil van Dijk", "Alisson", "Jordan Henderson"] },
      { titulo: "Jugaron en el Atlético de Madrid", nivel: 2, nombres: ["Fernando Torres", "Diego Costa", "Antoine Griezmann", "Koke"] },
      { titulo: "Canteranos del Real Madrid", nivel: 3, nombres: ["Lucas Vázquez", "Iker Casillas", "Guti", "Dani Carvajal"] },
    ],
  },
  {
    id: "paises",
    grupos: [
      { titulo: "Croatas", nivel: 0, nombres: ["Luka Modrić", "Ivan Rakitić", "Mario Mandžukić", "Ivan Perišić"] },
      { titulo: "Belgas", nivel: 1, nombres: ["Kevin De Bruyne", "Eden Hazard", "Thibaut Courtois", "Romelu Lukaku"] },
      { titulo: "Neerlandeses", nivel: 2, nombres: ["Johan Cruyff", "Marco van Basten", "Arjen Robben", "Robin van Persie"] },
      { titulo: "Galeses", nivel: 3, nombres: ["Gareth Bale", "Ryan Giggs", "Aaron Ramsey", "Ian Rush"] },
    ],
  },
  {
    id: "premier",
    grupos: [
      { titulo: "Jugaron en el Chelsea", nivel: 0, nombres: ["Didier Drogba", "Frank Lampard", "John Terry", "Eden Hazard"] },
      { titulo: "Jugaron en el Arsenal", nivel: 1, nombres: ["Thierry Henry", "Dennis Bergkamp", "Patrick Vieira", "Freddie Ljungberg"] },
      { titulo: "Jugaron en el Manchester United", nivel: 2, nombres: ["Wayne Rooney", "Paul Scholes", "Ruud van Nistelrooy", "Rio Ferdinand"] },
      { titulo: "Jugaron en el Liverpool", nivel: 3, nombres: ["Steven Gerrard", "Jamie Carragher", "Dirk Kuyt", "Roberto Firmino"] },
    ],
  },
  {
    id: "entrenadores",
    grupos: [
      { titulo: "Entrenadores alemanes", nivel: 0, nombres: ["Jürgen Klopp", "Hansi Flick", "Thomas Tuchel", "Julian Nagelsmann"] },
      { titulo: "Entrenadores italianos", nivel: 1, nombres: ["Antonio Conte", "Massimiliano Allegri", "Luciano Spalletti", "Maurizio Sarri"] },
      { titulo: "Han entrenado al Real Madrid", nivel: 2, nombres: ["Zinedine Zidane", "José Mourinho", "Rafa Benítez", "Manuel Pellegrini"] },
      { titulo: "Ganaron el Mundial como seleccionadores", nivel: 3, nombres: ["Aimé Jacquet", "Didier Deschamps", "Lionel Scaloni", "Luiz Felipe Scolari"] },
    ],
  },
  {
    id: "porteros",
    grupos: [
      { titulo: "Porteros españoles", nivel: 0, nombres: ["Iker Casillas", "Víctor Valdés", "David de Gea", "Unai Simón"] },
      { titulo: "Porteros brasileños", nivel: 1, nombres: ["Alisson", "Ederson", "Júlio César", "Dida"] },
      { titulo: "Porteros alemanes", nivel: 2, nombres: ["Manuel Neuer", "Oliver Kahn", "Marc-André ter Stegen", "Jens Lehmann"] },
      { titulo: "Porteros italianos", nivel: 3, nombres: ["Gianluigi Buffon", "Gianluigi Donnarumma", "Dino Zoff", "Francesco Toldo"] },
    ],
  },
  {
    id: "italia-y-bayern",
    grupos: [
      { titulo: "Jugaron en el Bayern", nivel: 0, nombres: ["Robert Lewandowski", "Thomas Müller", "Franck Ribéry", "Philipp Lahm"] },
      { titulo: "Jugaron en el Milan", nivel: 1, nombres: ["Paolo Maldini", "Andriy Shevchenko", "Kaká", "Gennaro Gattuso"] },
      { titulo: "Jugaron en la Juventus", nivel: 2, nombres: ["Alessandro Del Piero", "Pavel Nedvěd", "Giorgio Chiellini", "Paulo Dybala"] },
      { titulo: "Jugaron en el Inter", nivel: 3, nombres: ["Javier Zanetti", "Marco Materazzi", "Wesley Sneijder", "Lautaro Martínez"] },
    ],
  },
  {
    id: "posiciones",
    grupos: [
      { titulo: "Laterales brasileños", nivel: 0, nombres: ["Roberto Carlos", "Cafu", "Marcelo", "Dani Alves"] },
      { titulo: "Centrales españoles", nivel: 1, nombres: ["Carles Puyol", "Gerard Piqué", "Sergio Ramos", "Fernando Hierro"] },
      { titulo: "Delanteros argentinos", nivel: 2, nombres: ["Gabriel Batistuta", "Hernán Crespo", "Sergio Agüero", "Gonzalo Higuaín"] },
      { titulo: "Mediocentros franceses", nivel: 3, nombres: ["N'Golo Kanté", "Claude Makélélé", "Patrick Vieira", "Aurélien Tchouaméni"] },
    ],
  },
  {
    id: "apellidos",
    grupos: [
      { titulo: "Se apellidan Silva", nivel: 0, nombres: ["David Silva", "Bernardo Silva", "Thiago Silva", "André Silva"] },
      { titulo: "Se apellidan Torres", nivel: 1, nombres: ["Fernando Torres", "Ferran Torres", "Pau Torres", "Óliver Torres"] },
      { titulo: "Se apellidan Martínez", nivel: 2, nombres: ["Lautaro Martínez", "Lisandro Martínez", "Emiliano Martínez", "Javi Martínez"] },
      { titulo: "Se apellidan Hernández", nivel: 3, nombres: ["Xavi Hernández", "Javier Hernández", "Theo Hernández", "Lucas Hernández"] },
    ],
  },
  {
    id: "clubes",
    grupos: [
      { titulo: "Clubes de Londres", nivel: 0, nombres: ["Arsenal", "Chelsea", "Tottenham", "West Ham"] },
      { titulo: "Clubes de Madrid", nivel: 1, nombres: ["Real Madrid", "Atlético de Madrid", "Rayo Vallecano", "Getafe"] },
      { titulo: "Clubes alemanes", nivel: 2, nombres: ["Bayern de Múnich", "Borussia Dortmund", "Schalke 04", "Bayer Leverkusen"] },
      { titulo: "Clubes portugueses", nivel: 3, nombres: ["Benfica", "Sporting de Portugal", "Oporto", "Braga"] },
    ],
  },
  {
    id: "estadios",
    grupos: [
      { titulo: "Estadios ingleses", nivel: 0, nombres: ["Anfield", "Old Trafford", "Stamford Bridge", "Emirates"] },
      { titulo: "Estadios españoles", nivel: 1, nombres: ["Camp Nou", "Santiago Bernabéu", "Metropolitano", "Mestalla"] },
      { titulo: "Estadios alemanes", nivel: 2, nombres: ["Allianz Arena", "Signal Iduna Park", "Veltins-Arena", "BayArena"] },
      { titulo: "Estadios italianos", nivel: 3, nombres: ["San Siro", "Diego Armando Maradona", "Olímpico de Roma", "Luigi Ferraris"] },
    ],
  },
  {
    id: "dobles",
    grupos: [
      { titulo: "Campeones del mundo con Brasil en 2002", nivel: 0, nombres: ["Ronaldo Nazário", "Rivaldo", "Cafu", "Roberto Carlos"] },
      { titulo: "Jugaron en el Real Madrid y en el Chelsea", nivel: 1, nombres: ["Eden Hazard", "Thibaut Courtois", "Mateo Kovačić", "Claude Makélélé"] },
      { titulo: "Jugaron en el Barça y en el Atlético", nivel: 2, nombres: ["Antoine Griezmann", "Luis Suárez", "David Villa", "Memphis Depay"] },
      { titulo: "Ganaron la Champions como jugadores y como entrenadores", nivel: 3, nombres: ["Zinedine Zidane", "Pep Guardiola", "Carlo Ancelotti", "Frank Rijkaard"] },
    ],
  },
];

/** Todos los nombres del panel, en un orden revuelto fijo (mismo para todos). */
export function mezclar(panel: Panel, semilla: number): string[] {
  const todos = panel.grupos.flatMap((g) => g.nombres);
  let s = Math.imul(semilla + 7, 2654435761) >>> 0;
  for (let k = todos.length - 1; k > 0; k--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const m = Math.floor((s / 4294967296) * (k + 1));
    [todos[k], todos[m]] = [todos[m], todos[k]];
  }
  return todos;
}
