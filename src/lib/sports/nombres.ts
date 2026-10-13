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

/**
 * Pone en español los nombres de equipo de una respuesta del API (13-oct):
 * recorre la respuesta y, en cada objeto con forma de equipo (`id` número,
 * `name` y `logo` texto), traduce el nombre con `conTildes`. Así cabeceras,
 * tablas, calendarios y marcadores salen bien sin tocar cada componente. Los
 * jugadores no tienen `logo` (tienen `photo`): no se tocan. Devuelve una
 * copia solo donde cambia algo; lo demás, el mismo objeto.
 */
export function equiposEnEspanol<T>(dato: T): T {
  if (Array.isArray(dato)) {
    let cambio = false;
    const out = dato.map((x) => {
      const y = equiposEnEspanol(x);
      if (y !== x) cambio = true;
      return y;
    });
    return (cambio ? out : dato) as T;
  }
  if (dato === null || typeof dato !== "object") return dato;
  const o = dato as Record<string, unknown>;
  let copia: Record<string, unknown> | null = null;
  if (typeof o.id === "number" && typeof o.name === "string" && typeof o.logo === "string") {
    const es = conTildes(o.name);
    if (es !== o.name) copia = { ...o, name: es };
  }
  for (const [k, v] of Object.entries(o)) {
    if (v === null || typeof v !== "object") continue;
    const nv = equiposEnEspanol(v);
    if (nv !== v) {
      copia = copia ?? { ...o };
      copia[k] = nv;
    }
  }
  return (copia ?? o) as T;
}
