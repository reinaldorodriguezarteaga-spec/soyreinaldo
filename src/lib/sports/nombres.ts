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

/* ------------------------------------------------------------------------
 * Nombre corto de un JUGADOR, como en los marcadores del móvil (15-oct,
 * pedido del dueño). Lo usan la ficha de partido (con el nombre de la
 * plantilla) y las tarjetas de resultados (con el del evento).
 * ---------------------------------------------------------------------- */

const PARTICULAS = new Set(["de", "da", "do", "dos", "das", "del", "di", "van", "von", "der", "den", "la", "le", "ter", "ten", "al"]);
const SUFIJOS = new Set(["júnior", "junior", "jr", "jr.", "neto", "filho", "sobrinho"]);

/** Jugadores que se conocen por un nombre que no sale de la regla general
 * (clave: nombre de la plantilla o del evento, en minúsculas y sin tildes).
 * Ampliable: si alguno sale raro en una ficha, se añade aquí. */
const ALIAS: Record<string, string> = {
  "vinicius junior": "Vini Jr.",
  "vinicius jr.": "Vini Jr.",
  "gabriel jesus": "Gabriel Jesus",
  "lamine yamal": "Lamine Yamal",
  "endrick felipe moreira de sousa": "Endrick",
  // Los eventos traen el nombre completo y la regla se quedaba con el último
  // apellido («Belloli», 26-oct).
  "raphael dias belloli": "Raphinha",
};

const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Jugadores que no se muestran con el nombre completo del API en ningún
 * sitio (plantillas, pizarra, juegos): el dueño, 22-oct, «a Cubarsí, solo
 * Cubarsí». */
const NOMBRE_VISIBLE: Record<string, string> = {
  "pau cubarsi paredes": "Cubarsí",
  "pau cubarsi": "Cubarsí",
};

/** Jugadores que el API mete en la primera plantilla y no son de ella: el
 * dueño, 22-oct, «quita a ese Aller que aparece siempre con el 1» (portero
 * del filial con el dorsal de Joan García). Por id del API. */
export const FUERA_DE_PLANTILLA = new Set<number>([543468]);

/** El nombre con el que se enseña a un jugador en las plantillas: el que se
 * le ha fijado a mano, su alias («Raphinha») o, si el API trae los dos
 * apellidos, nombre y primer apellido («Giuliano Simeone Baldini» →
 * «Giuliano Simeone», el dueño, 31-oct). Con partículas, tal cual. */
export function nombreVisible(nombre: string): string {
  const clave = sinTildes(nombre.trim());
  const fijado = NOMBRE_VISIBLE[clave] ?? ALIAS[clave];
  if (fijado) return fijado;
  const partes = nombre.trim().split(/\s+/);
  if (
    partes.length < 3 ||
    partes.some((p) => PARTICULAS.has(p.toLowerCase()) || p.endsWith(".")) ||
    SUFIJOS.has(partes[partes.length - 1].toLowerCase())
  )
    return nombre;
  return `${partes[0]} ${partes[partes.length - 2]}`;
}

/** Nombre corto como en los marcadores de los móviles: primero el alias; si
 * no, el apellido ("Dani Olmo" → "Olmo", "K. Mbappé" → "Mbappé", "Marten de
 * Roon" → "de Roon"); con dos apellidos, el primero ("Pablo Barrios Rivas" →
 * "Barrios"); los de una palabra ("Endrick", "Pedri"), tal cual. */
export function nombreCorto(nombre: string): string {
  const alias = ALIAS[sinTildes(nombre.trim())];
  if (alias) return alias;
  const partes = nombre.trim().split(/\s+/);
  if (partes.length <= 1) return nombre;
  const ult = partes[partes.length - 1];
  if (SUFIJOS.has(ult.toLowerCase())) return partes.slice(-2).join(" ");
  // Nombre completo con los dos apellidos, como manda ahora el API en LaLiga
  // («Giuliano Simeone Baldini», «Pablo Barrios Rivas»): el conocido es el
  // primero, el penúltimo. El dueño, 31-oct: «le ponen el segundo apellido».
  // Con partículas («Ferreira de Castro») sigue la regla de siempre.
  if (partes.length >= 3 && !partes.some((p) => PARTICULAS.has(p.toLowerCase())))
    return partes[partes.length - 2];
  let i = partes.length - 1;
  while (i > 0 && PARTICULAS.has(partes[i - 1].toLowerCase())) i--;
  return partes.slice(i).join(" ");
}
