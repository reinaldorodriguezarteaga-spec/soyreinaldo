/**
 * API-Football escribe los nombres sin tildes ("Malaga", "Atletico Madrid")
 * y las selecciones en inglés.
 * En los textos redactados (la previa) y en nuestra tabla `lq_teams` los
 * queremos bien escritos. Solo los que hacen falta; el resto pasa igual.
 * La misma lista está en scripts/seed-liga-quiniela.mjs (si se añade uno,
 * añadirlo allí también).
 */
const CON_TILDES: Record<string, string> = {
  Alaves: "Alavés",
  "Atletico Madrid": "Atlético Madrid",
  "Deportivo La Coruna": "Deportivo La Coruña",
  Malaga: "Málaga",
  Cadiz: "Cádiz",
  Leganes: "Leganés",
  Almeria: "Almería",
};

/**
 * Selecciones: el API las nombra en inglés ("Belgium", "Türkiye", "Spain").
 * En los textos redactados (previa, crónica) van en español. 13-oct-2026,
 * al añadir la Nations League y las eliminatorias.
 */
const SELECCIONES: Record<string, string> = {
  Spain: "España", Germany: "Alemania", France: "Francia", Italy: "Italia",
  England: "Inglaterra", Netherlands: "Países Bajos", Belgium: "Bélgica",
  Croatia: "Croacia", Switzerland: "Suiza", Denmark: "Dinamarca",
  Sweden: "Suecia", Norway: "Noruega", Poland: "Polonia", Scotland: "Escocia",
  Wales: "Gales", "Czech Republic": "Chequia", Czechia: "Chequia",
  Hungary: "Hungría", Ukraine: "Ucrania", Greece: "Grecia", Romania: "Rumanía",
  Slovakia: "Eslovaquia", Slovenia: "Eslovenia", Ireland: "Irlanda",
  "Republic of Ireland": "Irlanda", "Northern Ireland": "Irlanda del Norte",
  Iceland: "Islandia", Finland: "Finlandia", "Bosnia & Herzegovina": "Bosnia y Herzegovina",
  "Bosnia and Herzegovina": "Bosnia y Herzegovina", "North Macedonia": "Macedonia del Norte",
  Türkiye: "Turquía", Turkey: "Turquía", Russia: "Rusia", Belarus: "Bielorrusia",
  Azerbaijan: "Azerbaiyán", Kazakhstan: "Kazajistán", Cyprus: "Chipre",
  Luxembourg: "Luxemburgo", Latvia: "Letonia", Lithuania: "Lituania",
  "Faroe Islands": "Islas Feroe", Brazil: "Brasil", Peru: "Perú",
  USA: "Estados Unidos", "United States": "Estados Unidos", Mexico: "México",
  "Saudi Arabia": "Arabia Saudí", Japan: "Japón", "South Korea": "Corea del Sur",
  Morocco: "Marruecos", Egypt: "Egipto", Tunisia: "Túnez", Algeria: "Argelia",
  Cameroon: "Camerún", "Ivory Coast": "Costa de Marfil", "South Africa": "Sudáfrica",
  Canada: "Canadá", Panama: "Panamá", Haiti: "Haití", Jordan: "Jordania",
  Qatar: "Catar", Iran: "Irán", Iraq: "Irak", "New Zealand": "Nueva Zelanda",
};

export function conTildes(nombre: string): string {
  return CON_TILDES[nombre] ?? SELECCIONES[nombre] ?? nombre;
}
