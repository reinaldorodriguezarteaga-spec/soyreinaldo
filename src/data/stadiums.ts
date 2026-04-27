export type Stadium = {
  slug: string;
  name: string;
  club: string;
  city: string;
  coords: [number, number];
  founded: number;
  capacity: number;
  description: string;
  history: string;
  heroImage?: string;
  visitImages: string[];
};

export const stadiums: Stadium[] = [
  {
    slug: "camp-nou",
    name: "Camp Nou",
    club: "FC Barcelona",
    city: "Barcelona",
    coords: [41.3809, 2.1228],
    founded: 1957,
    capacity: 99354,
    description:
      'Mi casa. "Més que un club" no es un lema, es lo que se siente al pisarlo.',
    history:
      "Inaugurado el 24 de septiembre de 1957, sustituyendo al antiguo Camp de Les Corts. Es el estadio más grande de Europa y uno de los templos del fútbol mundial. Acogió la final de los JJOO de Barcelona '92 y varias finales de Champions y Eurocopa. Actualmente está en plena remodelación dentro del proyecto Espai Barça.",
    heroImage: "/estadios/camp-nou-panoramica.jpg",
    visitImages: [
      "/estadios/camp-nou-museo-1.jpg",
      "/estadios/camp-nou-museo-2.jpg",
      "/estadios/camp-nou-museo-3.jpg",
    ],
  },
  {
    slug: "metropolitano",
    name: "Riyadh Air Metropolitano",
    club: "Atlético de Madrid",
    city: "Madrid",
    coords: [40.4362, -3.5994],
    founded: 2017,
    capacity: 70692,
    description:
      "El estadio del Atlético de Madrid, levantado sobre los cimientos de La Peineta.",
    history:
      "Reabierto en 2017 tras una remodelación completa de La Peineta (que existía desde 1994 como pista de atletismo). Estrenó como Wanda Metropolitano y ha pasado por Cívitas hasta su nombre actual. Acogió la final de la Champions 2019 entre Tottenham y Liverpool.",
    visitImages: ["/estadios/metropolitano.jpg"],
  },
  {
    slug: "coliseum",
    name: "Coliseum",
    club: "Getafe CF",
    city: "Getafe",
    coords: [40.3253, -3.7144],
    founded: 1998,
    capacity: 17393,
    description:
      "Casa del Getafe CF desde 1998, en pleno sur de la Comunidad de Madrid.",
    history:
      'Inaugurado en 1998 como Coliseum Alfonso Pérez, en homenaje al delantero madrileño nacido en Getafe. En 2019 perdió el "Alfonso Pérez" por petición del propio jugador, y desde entonces se llama simplemente Coliseum. Pequeño pero ruidoso cuando el Geta aprieta.',
    visitImages: ["/estadios/getafe.jpg"],
  },
];
