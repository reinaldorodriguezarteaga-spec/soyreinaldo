import { JUGADORES } from "./carreras";

/**
 * Caras de los jugadores de los juegos (22-oct, pedido del dueño): id de
 * API-Football de cada jugador de `carreras.ts`, buscado por nombre y año
 * de nacimiento y revisado a mano. Sin foto en la API (Figo, Batistuta,
 * Morientes, Overmars), se queda la bandera.
 */
const IDS: Record<string, number> = {
  messi: 154,
  cristiano: 874,
  neymar: 276,
  mbappe: 278,
  zlatan: 51070,
  lewandowski: 521,
  benzema: 759,
  suarez: 157,
  aguero: 642,
  higuain: 2297,
  falcao: 119,
  torres: 33413,
  cavani: 274,
  lukaku: 907,
  ronaldinho: 114413,
  kaka: 105404,
  ronaldo: 115639,
  zidane: 193313,
  henry: 114876,
  etoo: 42432,
  villa: 33257,
  xabi: 90657,
  iniesta: 33243,
  pique: 136,
  cesc: 108,
  silva: 634,
  ramos: 738,
  casillas: 367,
  modric: 754,
  kroos: 752,
  bale: 758,
  gerrard: 105422,
  lampard: 105426,
  drogba: 102731,
  dimaria: 266,
  alves: 256,
  pirlo: 105405,
  buffon: 254,
  delpiero: 115353,
  shevchenko: 118048,
  vanpersie: 37162,
  robben: 516,
  sneijder: 42309,
  rooney: 50773,
  beckham: 113755,
  owen: 114815,
  salah: 306,
  debruyne: 629,
  haaland: 1100,
  kane: 184,
  mascherano: 13073,
  coutinho: 147,
  vidal: 151,
  isco: 745,
  courtois: 730,
  mane: 304,
  varane: 742,
  bellingham: 129718,
  raul: 115023,
  yaya: 90493,
  cech: 1436,
  nesta: 115366,
  cannavaro: 118025,
  riquelme: 217943,
  forlan: 110391,
  vannistelrooy: 115074,
  klose: 115068,
  muller: 522,
  gotze: 16,
  reus: 25,
  casemiro: 747,
  alexis: 910,
  mahrez: 635,
  seedorf: 114537,
  ozil: 1458,
  dybala: 875,
  lautaro: 217,
  osimhen: 2780,
  kvara: 483,
  pedri: 133609,
  hazard: 2296,
  vinicius: 762,
  xavi: 42041,
  odegaard: 37127,
  valverde: 756,
  son: 186,
  hakimi: 9,
};

export const fotoJugador = (apiId: number) => `https://media.api-sports.io/football/players/${apiId}.png`;

/** Foto de un jugador de las carreras por su id interno ("messi"). */
export function caraDe(id: string): string | null {
  const n = IDS[id];
  return n ? fotoJugador(n) : null;
}

const porNombre = new Map(JUGADORES.map((j) => [j.nombre, j.id]));
/** Foto por nombre completo ("Lionel Messi"), para las leyendas que también
 * están en las carreras. */
export function caraPorNombre(nombre: string): string | null {
  const id = porNombre.get(nombre);
  return id ? caraDe(id) : null;
}
