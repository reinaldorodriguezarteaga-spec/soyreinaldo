import { aleatorio } from "./diario";

/**
 * «Once de leyenda» (21-oct): once rondas, una por puesto del 4-3-3, con tres
 * leyendas a elegir. Las medias (estilo videojuego, puestas a mano y
 * discutibles a propósito) no se ven hasta el final: gana quien sepa quién
 * era mejor. El reto del día da las mismas ternas a todos.
 */

export type Puesto = "POR" | "LD" | "DFC" | "LI" | "MC" | "ED" | "DC" | "EI";
export type Leyenda = { nombre: string; pais: string; media: number };

/** Los once huecos del 4-3-3, de la portería a la delantera (cada línea de
 * derecha a izquierda, como el resto de juegos). */
export const HUECOS: Puesto[] = ["POR", "LD", "DFC", "DFC", "LI", "MC", "MC", "MC", "ED", "DC", "EI"];
export const LINEAS = [[0], [1, 2, 3, 4], [5, 6, 7], [8, 9, 10]];

export const NOMBRE_PUESTO: Record<Puesto, string> = {
  POR: "Portero",
  LD: "Lateral derecho",
  DFC: "Central",
  LI: "Lateral izquierdo",
  MC: "Centrocampista",
  ED: "Extremo derecho",
  DC: "Delantero centro",
  EI: "Extremo izquierdo",
};

const l = (nombre: string, pais: string, media: number): Leyenda => ({ nombre, pais, media });

export const LEYENDAS: Record<Puesto, Leyenda[]> = {
  POR: [
    l("Lev Yashin", "ru", 95), l("Gianluigi Buffon", "it", 94), l("Iker Casillas", "es", 93), l("Manuel Neuer", "de", 93),
    l("Oliver Kahn", "de", 92), l("Peter Schmeichel", "dk", 92), l("Petr Čech", "cz", 90), l("Thibaut Courtois", "be", 91),
    l("Jan Oblak", "si", 90), l("Marc-André ter Stegen", "de", 89), l("Andoni Zubizarreta", "es", 87), l("Víctor Valdés", "es", 86),
  ],
  LD: [
    l("Cafú", "br", 94), l("Philipp Lahm", "de", 93), l("Carlos Alberto", "br", 92), l("Dani Alves", "br", 92),
    l("Javier Zanetti", "ar", 91), l("Lilian Thuram", "fr", 91), l("Joshua Kimmich", "de", 89), l("Dani Carvajal", "es", 88),
    l("Gary Neville", "gb-eng", 87), l("Trent Alexander-Arnold", "gb-eng", 87), l("Achraf Hakimi", "ma", 87), l("Míchel Salgado", "es", 85),
  ],
  DFC: [
    l("Franz Beckenbauer", "de", 97), l("Franco Baresi", "it", 95), l("Sergio Ramos", "es", 93), l("Alessandro Nesta", "it", 93),
    l("Fabio Cannavaro", "it", 93), l("Carles Puyol", "es", 92), l("Virgil van Dijk", "nl", 92), l("Fernando Hierro", "es", 91),
    l("Thiago Silva", "br", 91), l("Gerard Piqué", "es", 90), l("John Terry", "gb-eng", 90), l("Ronald Koeman", "nl", 90),
    l("Rio Ferdinand", "gb-eng", 90), l("Nemanja Vidić", "rs", 89), l("Raphaël Varane", "fr", 88)
  ],
  LI: [
    l("Paolo Maldini", "it", 96), l("Roberto Carlos", "br", 94), l("Giacinto Facchetti", "it", 92), l("Marcelo", "br", 91),
    l("Andreas Brehme", "de", 90), l("Jordi Alba", "es", 89), l("Ashley Cole", "gb-eng", 89), l("David Alaba", "at", 89),
    l("Bixente Lizarazu", "fr", 88), l("Patrice Evra", "fr", 87), l("Andrew Robertson", "gb-sct", 87), l("Éric Abidal", "fr", 86),
  ],
  MC: [
    l("Diego Maradona", "ar", 99), l("Zinedine Zidane", "fr", 97), l("Michel Platini", "fr", 95), l("Xavi Hernández", "es", 95),
    l("Andrés Iniesta", "es", 95), l("Luka Modrić", "hr", 94), l("Lothar Matthäus", "de", 94), l("Andrea Pirlo", "it", 93),
    l("Kaká", "br", 93), l("Kevin De Bruyne", "be", 93), l("Toni Kroos", "de", 92), l("Steven Gerrard", "gb-eng", 92),
    l("Michael Laudrup", "dk", 92), l("Frank Rijkaard", "nl", 92), l("Sergio Busquets", "es", 91), l("Frank Lampard", "gb-eng", 91),
    l("Paul Scholes", "gb-eng", 91), l("Patrick Vieira", "fr", 91), l("Rodri", "es", 91), l("Xabi Alonso", "es", 90),
    l("Bastian Schweinsteiger", "de", 90), l("Pep Guardiola", "es", 89), l("Claude Makélélé", "fr", 89), l("Pedri", "es", 89),
  ],
  ED: [
    l("Lionel Messi", "ar", 99), l("Garrincha", "br", 95), l("Luís Figo", "pt", 93), l("Hristo Stoichkov", "bg", 92),
    l("Arjen Robben", "nl", 91), l("Mohamed Salah", "eg", 91), l("Gareth Bale", "gb-wls", 90), l("Lamine Yamal", "es", 90),
    l("David Beckham", "gb-eng", 89), l("Ángel Di María", "ar", 89), l("Marc Overmars", "nl", 88), l("Riyad Mahrez", "dz", 87),
  ],
  DC: [
    l("Pelé", "br", 99), l("Johan Cruyff", "nl", 98), l("Ronaldo Nazário", "br", 97), l("Alfredo Di Stéfano", "es", 97),
    l("Ferenc Puskás", "hu", 96), l("Marco van Basten", "nl", 95), l("Eusébio", "pt", 95), l("Romário", "br", 94),
    l("Gerd Müller", "de", 94), l("Thierry Henry", "fr", 94), l("Robert Lewandowski", "pl", 92), l("Luis Suárez", "uy", 92),
    l("Karim Benzema", "fr", 92), l("Zlatan Ibrahimović", "se", 92), l("Andriy Shevchenko", "ua", 92), l("Erling Haaland", "no", 92),
    l("Samuel Eto'o", "cm", 91), l("Gabriel Batistuta", "ar", 91), l("Harry Kane", "gb-eng", 91), l("Raúl González", "es", 91),
  ],
  EI: [
    l("Cristiano Ronaldo", "pt", 98), l("Ronaldinho", "br", 96), l("Kylian Mbappé", "fr", 94), l("Neymar", "br", 93),
    l("Rivaldo", "br", 93), l("Pavel Nedvěd", "cz", 92), l("Vinícius Júnior", "br", 91), l("Ryan Giggs", "gb-wls", 90),
    l("Franck Ribéry", "fr", 90), l("Eden Hazard", "be", 90), l("Sadio Mané", "sn", 89), l("Raphinha", "br", 87),
  ],
};

export type Terna = Leyenda[];

/** Las once ternas de una partida: sin repetir jugador (los dos centrales y
 * los tres medios salen del mismo grupo). */
export function ternas(semilla: number): Terna[] {
  const azar = aleatorio(semilla);
  const usados = new Set<string>();
  return HUECOS.map((p) => {
    const libres = LEYENDAS[p].filter((x) => !usados.has(x.nombre));
    const t: Leyenda[] = [];
    while (t.length < 3 && libres.length) {
      const [x] = libres.splice(Math.floor(azar() * libres.length), 1);
      t.push(x);
      usados.add(x.nombre);
    }
    return t;
  });
}

/** Media del once (un decimal) y cuántas veces se eligió al mejor de la terna. */
export function resultado(elegidos: Leyenda[], ts: Terna[]): { media: number; maxima: number; mejores: number } {
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const mejorDe = ts.map((t) => Math.max(...t.map((x) => x.media)));
  return {
    media: Math.round((suma(elegidos.map((x) => x.media)) / elegidos.length) * 10) / 10,
    maxima: Math.round((suma(mejorDe) / mejorDe.length) * 10) / 10,
    mejores: elegidos.filter((x, i) => x.media === mejorDe[i]).length,
  };
}
