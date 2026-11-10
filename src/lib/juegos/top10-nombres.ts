/**
 * Nombres para el «Top 10» cuando el de la API no es el que conoce la gente
 * (a veces da el nombre completo: «Xavier Hernández Creus» → «Xavi»).
 * `nombre` es lo que se enseña; `alias`, otras formas que valen como
 * respuesta (el apellido y el nombre de la API ya valen solos). Clave: id
 * del jugador en API-Football. Revisado a mano el 10-nov-2026.
 */
export const NOMBRES_TOP10: Record<number, { nombre?: string; alias?: string[] }> = {
  179968: { nombre: "Albert Riera" },
  48528: { nombre: "Alex Song", alias: ["Song"] },
  80710: { nombre: "André Santos" },
  116880: { nombre: "Carles Puyol", alias: ["Puyol"] },
  308: { nombre: "Daniel Sturridge" },
  882: { nombre: "David de Gea", alias: ["De Gea"] },
  9215: { nombre: "Denílson" },
  102731: { nombre: "Didier Drogba" },
  110391: { nombre: "Diego Forlán" },
  1571: { nombre: "Javi García" },
  114577: { nombre: "Fábio Aurélio" },
  42039: { nombre: "Gabi" },
  26306: { nombre: "Gonzalo Castro" },
  367: { nombre: "Iker Casillas" },
  47034: { nombre: "José Antonio Reyes", alias: ["Reyes"] },
  115736: { nombre: "Belletti" },
  104129: { nombre: "Kolo Touré", alias: ["Kolo"] },
  117025: { nombre: "Luis Perea", alias: ["Perea"] },
  114900: { nombre: "Manuel Almunia" },
  87211: { nombre: "Maxwell" },
  114745: { nombre: "Mikel Arteta" },
  19243: { nombre: "John Obi Mikel", alias: ["Mikel", "Obi Mikel"] },
  42188: { nombre: "Nigel de Jong", alias: ["De Jong"] },
  396623: { nombre: "Pau Cubarsí" },
  114800: { nombre: "Raul Meireles" },
  37162: { nombre: "Robin van Persie", alias: ["Van Persie", "RVP"] },
  25352: { nombre: "Salomon Kalou" },
  42432: { nombre: "Samuel Eto'o" },
  116873: { nombre: "Simão", alias: ["Simao Sabrosa"] },
  104839: { nombre: "Tiago Mendes", alias: ["Tiago"] },
  90608: { nombre: "Abou Diaby" },
  90515: { nombre: "Víctor Valdés" },
  90657: { nombre: "Xabi Alonso" },
  42041: { nombre: "Xavi", alias: ["Xavi Hernández"] },
  90521: { nombre: "Álvaro Arbeloa" },
  114915: { nombre: "Álvaro Domínguez" },
  // Conocidos por un solo nombre.
  762: { nombre: "Vinícius Júnior", alias: ["Vini", "Vinicius Jr"] },
  280: { nombre: "Alisson", alias: ["Alisson Becker"] },
  507: { nombre: "Thiago Alcântara", alias: ["Thiago"] },
  874: { nombre: "Cristiano Ronaldo", alias: ["CR7", "Cristiano"] },
};
