import { aleatorio } from "./diario";

/**
 * «Cronología» (10-nov-2026, pedido del dueño): cinco momentos del fútbol que
 * hay que ordenar del más antiguo al más reciente. Curados a mano, solo
 * fechas seguras. En cada partida, los cinco son de años distintos (así no
 * hay empates que discutir).
 */

export type Momento = { id: string; texto: string; anio: number };

export const MAX_INTENTOS_CRONOLOGIA = 3;
export const POR_PARTIDA = 5;

export const MOMENTOS: Momento[] = [
  { id: "cruyff-barca", texto: "Johan Cruyff ficha por el Barça como jugador", anio: 1973 },
  { id: "mano-de-dios", texto: "Maradona marca con la «mano de Dios» a Inglaterra", anio: 1986 },
  { id: "wembley", texto: "El Barça gana su primera Copa de Europa, en Wembley", anio: 1992 },
  { id: "raul-debut", texto: "Raúl debuta con el Real Madrid", anio: 1994 },
  { id: "bosman", texto: "La sentencia Bosman cambia los fichajes", anio: 1995 },
  { id: "francia-mundial", texto: "Francia gana su primer Mundial, en casa", anio: 1998 },
  { id: "figo-madrid", texto: "Luís Figo cambia el Barça por el Real Madrid", anio: 2000 },
  { id: "volea-glasgow", texto: "Zidane marca la volea de Glasgow en la final de la Champions", anio: 2002 },
  { id: "beckham-madrid", texto: "David Beckham ficha por el Real Madrid", anio: 2003 },
  { id: "grecia-euro", texto: "Grecia gana la Eurocopa", anio: 2004 },
  { id: "ronaldinho-balon", texto: "Ronaldinho gana el Balón de Oro", anio: 2005 },
  { id: "cabezazo-materazzi", texto: "Zidane da un cabezazo a Materazzi en la final del Mundial", anio: 2006 },
  { id: "kaka-balon", texto: "Kaká gana el Balón de Oro", anio: 2007 },
  { id: "euro-viena", texto: "España gana la Eurocopa en Viena", anio: 2008 },
  { id: "sextete", texto: "El Barça de Guardiola gana el sextete", anio: 2009 },
  { id: "gol-iniesta", texto: "Iniesta marca el gol del Mundial en Johannesburgo", anio: 2010 },
  { id: "aguero-9320", texto: "Agüero marca en el minuto 93:20 y el City gana la Premier", anio: 2012 },
  { id: "ferguson-retiro", texto: "Sir Alex Ferguson se retira del Manchester United", anio: 2013 },
  { id: "decima", texto: "Sergio Ramos marca en el 93 y el Madrid gana la Décima", anio: 2014 },
  { id: "portugal-euro", texto: "Portugal gana la Eurocopa en Francia", anio: 2016 },
  { id: "remontada-psg", texto: "El Barça remonta al PSG con el 6-1", anio: 2017 },
  { id: "chilena-bale", texto: "Bale marca de chilena en la final de Kiev", anio: 2018 },
  { id: "anfield", texto: "El Liverpool le remonta un 3-0 al Barça en Anfield", anio: 2019 },
  { id: "dos-ocho", texto: "El Bayern golea 2-8 al Barça en Lisboa", anio: 2020 },
  { id: "messi-psg", texto: "Messi deja el Barça y ficha por el PSG", anio: 2021 },
  { id: "argentina-qatar", texto: "Argentina gana el Mundial de Catar", anio: 2022 },
  { id: "city-champions", texto: "El City de Guardiola gana su primera Champions", anio: 2023 },
  { id: "euro-berlin", texto: "España gana la Eurocopa en Berlín", anio: 2024 },
  { id: "invencibles", texto: "El Arsenal de los «invencibles» gana la Premier sin perder", anio: 2004 },
  { id: "estambul", texto: "El Liverpool remonta un 3-0 al Milan en la final de Estambul", anio: 2005 },
  { id: "cristiano-madrid", texto: "Cristiano Ronaldo ficha por el Real Madrid", anio: 2009 },
  { id: "inter-triplete", texto: "El Inter de Mourinho gana el triplete", anio: 2010 },
  { id: "chelsea-munich", texto: "El Chelsea gana su primera Champions, en Múnich", anio: 2012 },
  { id: "bayern-triplete", texto: "El Bayern de Heynckes gana el triplete", anio: 2013 },
  { id: "siete-uno", texto: "Alemania golea 1-7 a Brasil en su Mundial", anio: 2014 },
  { id: "leicester", texto: "El Leicester gana la Premier", anio: 2016 },
  { id: "neymar-psg", texto: "Neymar ficha por el PSG por 222 millones", anio: 2017 },
  { id: "modric-balon", texto: "Luka Modrić gana el Balón de Oro", anio: 2018 },
  { id: "atleti-liga-2021", texto: "El Atlético de Simeone gana su segunda Liga", anio: 2021 },
  { id: "benzema-balon", texto: "Karim Benzema gana el Balón de Oro", anio: 2022 },
  { id: "mbappe-madrid", texto: "Mbappé ficha por el Real Madrid", anio: 2024 },
  { id: "messi-debut", texto: "Messi debuta en partido oficial con el Barça", anio: 2004 },
  { id: "ronaldo-madrid", texto: "Ronaldo Nazário ficha por el Real Madrid", anio: 2002 },
  { id: "porto-mourinho", texto: "El Oporto de Mourinho gana la Champions", anio: 2004 },
  { id: "cantona-patada", texto: "Cantona da una patada a un aficionado en Selhurst Park", anio: 1995 },
  { id: "ovacion-ronaldinho", texto: "El Bernabéu aplaude a Ronaldinho", anio: 2005 },
  { id: "guardiola-banquillo", texto: "Guardiola debuta como entrenador del primer equipo del Barça", anio: 2008 },
  { id: "rodri-balon", texto: "Rodri gana el Balón de Oro", anio: 2024 },
  { id: "atleti-liga-2014", texto: "El Atlético gana la Liga en el Camp Nou", anio: 2014 },
  { id: "iniestazo", texto: "Iniesta marca el «iniestazo» en Stamford Bridge", anio: 2009 },
  { id: "cristiano-balon", texto: "Cristiano Ronaldo gana su primer Balón de Oro", anio: 2008 },
];

/** Cinco momentos de años distintos para la partida `semilla`. */
export function partidaCronologia(semilla: number): Momento[] {
  const azar = aleatorio(semilla);
  const revuelto = [...MOMENTOS];
  for (let k = revuelto.length - 1; k > 0; k--) {
    const m = Math.floor(azar() * (k + 1));
    [revuelto[k], revuelto[m]] = [revuelto[m], revuelto[k]];
  }
  const elegidos: Momento[] = [];
  const anios = new Set<number>();
  for (const m of revuelto) {
    if (anios.has(m.anio)) continue;
    elegidos.push(m);
    anios.add(m.anio);
    if (elegidos.length === POR_PARTIDA) break;
  }
  // Ya salen revueltos: en el orden en que se eligieron.
  return elegidos;
}
