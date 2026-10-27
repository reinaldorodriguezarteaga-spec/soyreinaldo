/**
 * Clubes del modo carrera (27-oct, pedido del dueño), por escalón. Ids de
 * API-Football comprobados contra /teams?league&season=2026 (escudos).
 *
 * 1 = la élite que puso el dueño (Madrid, Barça, City, Liverpool, Chelsea,
 * Bayern, PSG); 5 = segunda división, donde empieza la carrera.
 */

export type Escalon = 1 | 2 | 3 | 4 | 5;
export type ClubCarrera = { id: number; nombre: string; liga: string; escalon: Escalon };

const c = (escalon: Escalon, liga: string, lista: [number, string][]): ClubCarrera[] =>
  lista.map(([id, nombre]) => ({ id, nombre, liga, escalon }));

export const NOMBRE_ESCALON: Record<Escalon, string> = {
  1: "Élite mundial",
  2: "Grande de Europa",
  3: "Aspirante europeo",
  4: "Primera división",
  5: "Segunda división",
};

/** Media a partir de la cual se es titular en cada escalón. */
export const NIVEL_ESCALON: Record<Escalon, number> = { 1: 86, 2: 81, 3: 76, 4: 71, 5: 64 };

export const CLUBES_CARRERA: ClubCarrera[] = [
  ...c(1, "LaLiga", [[541, "Real Madrid"], [529, "Barcelona"]]),
  ...c(1, "Premier League", [[50, "Manchester City"], [40, "Liverpool"], [49, "Chelsea"]]),
  ...c(1, "Bundesliga", [[157, "Bayern de Múnich"]]),
  ...c(1, "Ligue 1", [[85, "PSG"]]),

  ...c(2, "LaLiga", [[530, "Atlético de Madrid"]]),
  ...c(2, "Premier League", [[42, "Arsenal"], [33, "Manchester United"], [47, "Tottenham"], [34, "Newcastle"]]),
  ...c(2, "Serie A", [[496, "Juventus"], [505, "Inter"], [489, "Milan"], [492, "Napoli"]]),
  ...c(2, "Bundesliga", [[165, "Borussia Dortmund"], [168, "Bayer Leverkusen"]]),

  ...c(3, "LaLiga", [[531, "Athletic Club"], [548, "Real Sociedad"], [533, "Villarreal"], [543, "Betis"], [536, "Sevilla"]]),
  ...c(3, "Premier League", [[66, "Aston Villa"], [51, "Brighton"], [65, "Nottingham Forest"]]),
  ...c(3, "Serie A", [[497, "Roma"], [487, "Lazio"], [499, "Atalanta"], [895, "Como"], [502, "Fiorentina"]]),
  ...c(3, "Bundesliga", [[173, "RB Leipzig"], [172, "Stuttgart"], [169, "Eintracht de Fráncfort"]]),
  ...c(3, "Ligue 1", [[81, "Olympique de Marsella"], [91, "Mónaco"], [80, "Olympique de Lyon"], [79, "Lille"]]),
  ...c(3, "Liga Portugal", [[211, "Benfica"], [212, "Oporto"], [228, "Sporting de Portugal"]]),
  ...c(3, "Eredivisie", [[194, "Ajax"], [197, "PSV"]]),

  ...c(4, "LaLiga", [
    [532, "Valencia"], [538, "Celta"], [727, "Osasuna"], [546, "Getafe"], [728, "Rayo Vallecano"], [540, "Espanyol"],
    [542, "Alavés"], [797, "Elche"], [539, "Levante"], [535, "Málaga"], [544, "Deportivo de La Coruña"], [4665, "Racing de Santander"],
  ]),
  ...c(4, "Premier League", [
    [45, "Everton"], [36, "Fulham"], [55, "Brentford"], [52, "Crystal Palace"], [35, "Bournemouth"], [63, "Leeds"], [746, "Sunderland"],
  ]),
  ...c(4, "Serie A", [[500, "Bologna"], [503, "Torino"], [494, "Udinese"], [495, "Genoa"], [488, "Sassuolo"], [490, "Cagliari"], [523, "Parma"]]),
  ...c(4, "Bundesliga", [[160, "Friburgo"], [164, "Mainz 05"], [167, "Hoffenheim"], [163, "Borussia M'gladbach"], [162, "Werder Bremen"], [182, "Union Berlín"]]),
  ...c(4, "Ligue 1", [[84, "Niza"], [94, "Rennes"], [116, "Lens"], [95, "Estrasburgo"], [96, "Toulouse"]]),

  ...c(5, "Segunda División", [
    [534, "Las Palmas"], [537, "Leganés"], [545, "Eibar"], [547, "Girona"], [715, "Granada"], [718, "Real Oviedo"], [719, "Tenerife"],
    [720, "Real Valladolid"], [722, "Albacete"], [723, "Almería"], [724, "Cádiz"], [731, "Sporting de Gijón"], [798, "Mallorca"],
    [713, "Córdoba"], [5254, "Castellón"], [9580, "Burgos"],
  ]),
  ...c(5, "Championship", [
    [38, "Watford"], [39, "Wolves"], [41, "Southampton"], [44, "Burnley"], [48, "West Ham"], [54, "Birmingham"], [70, "Middlesbrough"],
    [71, "Norwich"], [75, "Stoke City"], [76, "Swansea"], [62, "Sheffield United"], [69, "Derby County"],
  ]),
  ...c(5, "Serie B", [[498, "Sampdoria"], [504, "Hellas Verona"], [511, "Empoli"], [522, "Palermo"], [520, "Cremonese"], [801, "Pisa"], [899, "Módena"]]),
  ...c(5, "Ligue 2", [[82, "Montpellier"], [83, "Nantes"], [1063, "Saint-Étienne"], [93, "Reims"], [112, "Metz"], [90, "Guingamp"]]),
  ...c(5, "2. Bundesliga", [
    [159, "Hertha Berlín"], [161, "Wolfsburgo"], [166, "Hannover 96"], [171, "Núremberg"], [176, "Bochum"], [186, "St. Pauli"],
    [745, "Kaiserslautern"], [180, "Heidenheim"],
  ]),
];

export const clubPorId = (id: number) => CLUBES_CARRERA.find((x) => x.id === id) ?? null;
export const escudoClub = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;

/** Ligas de segunda para elegir el club inicial, en este orden. */
export const LIGAS_INICIO = ["Segunda División", "Championship", "Serie B", "Ligue 2", "2. Bundesliga"];

/** Nacionalidades para elegir: bandera, fuerza de la selección (probabilidad
 * aproximada de ganar su gran torneo) y su torneo continental. */
export type Nacion = { codigo: string; nombre: string; fuerza: number; continental: string };
export const NACIONES: Nacion[] = [
  { codigo: "es", nombre: "España", fuerza: 0.2, continental: "Eurocopa" },
  { codigo: "ar", nombre: "Argentina", fuerza: 0.2, continental: "Copa América" },
  { codigo: "fr", nombre: "Francia", fuerza: 0.18, continental: "Eurocopa" },
  { codigo: "br", nombre: "Brasil", fuerza: 0.17, continental: "Copa América" },
  { codigo: "gb-eng", nombre: "Inglaterra", fuerza: 0.15, continental: "Eurocopa" },
  { codigo: "de", nombre: "Alemania", fuerza: 0.13, continental: "Eurocopa" },
  { codigo: "pt", nombre: "Portugal", fuerza: 0.13, continental: "Eurocopa" },
  { codigo: "it", nombre: "Italia", fuerza: 0.1, continental: "Eurocopa" },
  { codigo: "nl", nombre: "Países Bajos", fuerza: 0.09, continental: "Eurocopa" },
  { codigo: "be", nombre: "Bélgica", fuerza: 0.06, continental: "Eurocopa" },
  { codigo: "hr", nombre: "Croacia", fuerza: 0.05, continental: "Eurocopa" },
  { codigo: "uy", nombre: "Uruguay", fuerza: 0.06, continental: "Copa América" },
  { codigo: "co", nombre: "Colombia", fuerza: 0.05, continental: "Copa América" },
  { codigo: "ma", nombre: "Marruecos", fuerza: 0.05, continental: "Copa África" },
  { codigo: "sn", nombre: "Senegal", fuerza: 0.04, continental: "Copa África" },
  { codigo: "mx", nombre: "México", fuerza: 0.03, continental: "Copa Oro" },
  { codigo: "us", nombre: "Estados Unidos", fuerza: 0.03, continental: "Copa Oro" },
  { codigo: "jp", nombre: "Japón", fuerza: 0.03, continental: "Copa Asiática" },
  { codigo: "ec", nombre: "Ecuador", fuerza: 0.03, continental: "Copa América" },
  { codigo: "ve", nombre: "Venezuela", fuerza: 0.015, continental: "Copa América" },
  { codigo: "pe", nombre: "Perú", fuerza: 0.015, continental: "Copa América" },
  { codigo: "cl", nombre: "Chile", fuerza: 0.02, continental: "Copa América" },
  { codigo: "ng", nombre: "Nigeria", fuerza: 0.03, continental: "Copa África" },
  { codigo: "gb-sct", nombre: "Escocia", fuerza: 0.015, continental: "Eurocopa" },
];
export const nacionPorCodigo = (cod: string) => NACIONES.find((n) => n.codigo === cod) ?? NACIONES[0];
