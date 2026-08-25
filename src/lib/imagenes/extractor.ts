// Extrae candidatas a imagen del HTML de una página y, sobre todo, intenta
// MEJORARLAS: casi todas las webs sirven miniaturas (WordPress -600x600,
// next/image?w=640, Twitter name=small...) y la original está a un cambio de
// URL de distancia. Cada regla genera variantes que la ruta API luego sondea
// de mejor a peor y se queda con la primera que existe de verdad.

export type ImagenCandidata = {
  /** URL tal como aparecía en la página. */
  url: string;
  /** De dónde salió: img | srcset | og | json-ld | css | enlace | lazy. */
  origen: string;
};

const EXT_IMAGEN = /\.(?:jpe?g|png|webp|avif|gif|svg)(?:$|[?#])/i;

function attr(tag: string, nombre: string): string | null {
  const m = tag.match(
    new RegExp(`(?:^|\\s)${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  if (!m) return null;
  const v = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  return v || null;
}

/** Del srcset se queda con el candidato de mayor anchura (o densidad). */
function mejorDeSrcset(srcset: string): string | null {
  let mejor: { url: string; peso: number } | null = null;
  for (const trozo of srcset.split(/,\s+/)) {
    const m = trozo.trim().match(/^(\S+)(?:\s+(\d+(?:\.\d+)?)([wx]))?$/);
    if (!m) continue;
    const peso = m[2] ? parseFloat(m[2]) * (m[3] === "x" ? 1000 : 1) : 0;
    if (!mejor || peso > mejor.peso) mejor = { url: m[1], peso };
  }
  return mejor?.url ?? null;
}

function recogerJsonLd(nodo: unknown, destino: string[]): void {
  if (typeof nodo === "string") return;
  if (Array.isArray(nodo)) {
    for (const item of nodo) recogerJsonLd(item, destino);
    return;
  }
  if (nodo && typeof nodo === "object") {
    for (const [clave, valor] of Object.entries(nodo)) {
      if (["image", "contentUrl", "thumbnailUrl", "logo"].includes(clave)) {
        if (typeof valor === "string") destino.push(valor);
        else if (Array.isArray(valor))
          for (const v of valor) {
            if (typeof v === "string") destino.push(v);
            else recogerJsonLd(v, destino);
          }
        else recogerJsonLd(valor, destino);
      } else if (typeof valor === "object") {
        recogerJsonLd(valor, destino);
      }
    }
    const url = (nodo as Record<string, unknown>).url;
    if (typeof url === "string" && EXT_IMAGEN.test(url)) {
      destino.push(url);
    }
  }
}

/** Saca todas las candidatas del HTML, resueltas contra la URL base. */
export function extraerCandidatas(html: string, base: string): ImagenCandidata[] {
  const crudas: ImagenCandidata[] = [];
  const anota = (url: string | null, origen: string) => {
    if (url) crudas.push({ url, origen });
  };

  // <img>: src, srcset y los atributos típicos de lazy-load.
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const srcset = attr(tag, "srcset") ?? attr(tag, "data-srcset");
    if (srcset) anota(mejorDeSrcset(srcset), "srcset");
    anota(attr(tag, "src"), "img");
    for (const lazy of ["data-src", "data-original", "data-lazy-src", "data-full-src"])
      anota(attr(tag, lazy), "lazy");
  }

  // <source> dentro de <picture>.
  for (const tag of html.match(/<source\b[^>]*>/gi) ?? []) {
    const srcset = attr(tag, "srcset") ?? attr(tag, "data-srcset");
    if (srcset) anota(mejorDeSrcset(srcset), "srcset");
  }

  // Metadatos sociales: suelen apuntar a la imagen principal en buena calidad.
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const prop = (attr(tag, "property") ?? attr(tag, "name"))?.toLowerCase();
    if (
      prop === "og:image" ||
      prop === "og:image:secure_url" ||
      prop === "twitter:image" ||
      prop === "twitter:image:src"
    ) {
      anota(attr(tag, "content"), "og");
    }
  }

  // <link rel="image_src"> y preloads de imagen.
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, "rel")?.toLowerCase();
    if (rel === "image_src") anota(attr(tag, "href"), "og");
    if (rel === "preload" && attr(tag, "as")?.toLowerCase() === "image") {
      const srcset = attr(tag, "imagesrcset");
      if (srcset) anota(mejorDeSrcset(srcset), "srcset");
      anota(attr(tag, "href"), "img");
    }
  }

  // JSON-LD (noticias y prensa lo usan casi siempre para la foto de portada).
  const reLd = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(reLd)) {
    try {
      const urls: string[] = [];
      recogerJsonLd(JSON.parse(m[1]), urls);
      for (const u of urls) anota(u, "json-ld");
    } catch {
      // JSON-LD roto: lo ignoramos.
    }
  }

  // background-image en estilos (solo si parece imagen por extensión).
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    if (EXT_IMAGEN.test(m[1])) anota(m[1], "css");
  }

  // Enlaces directos a ficheros de imagen (galerías "click para ampliar").
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    if (EXT_IMAGEN.test(m[1])) anota(m[1], "enlace");
  }

  // Resolver contra la base, filtrar esquemas raros y deduplicar.
  const vistas = new Set<string>();
  const limpias: ImagenCandidata[] = [];
  for (const c of crudas) {
    const cruda = c.url.replace(/&amp;/g, "&");
    if (/^(data|blob|javascript):/i.test(cruda)) continue;
    let abs: string;
    try {
      abs = new URL(cruda, base).href;
    } catch {
      continue;
    }
    if (!/^https?:/i.test(abs)) continue;
    if (vistas.has(abs)) continue;
    vistas.add(abs);
    limpias.push({ url: abs, origen: c.origen });
  }

  // Cazatodo: muchas webs (fcbarcelona.es, SPAs...) no ponen las fotos en
  // etiquetas sino en JSON incrustado con escapes unicode. Escaneamos el HTML
  // decodificado buscando URLs de imagen estén donde estén. Como aquí la misma
  // foto aparece en decenas de tamaños, deduplicamos por ruta (sin query).
  const rutasVistas = new Set(
    limpias.map((c) => {
      try {
        const u = new URL(c.url);
        return u.origin + u.pathname;
      } catch {
        return c.url;
      }
    }),
  );
  const decodificado = html
    .replace(/\\u003d/gi, "=")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
  const reUrlImagen =
    /https?:\/\/[^\s"'<>\\`]+?\.(?:jpe?g|png|webp|avif|gif)(?:\?[^\s"'<>\\`]*)?/gi;
  for (const m of decodificado.matchAll(reUrlImagen)) {
    const url = m[0].replace(/[.,;)]+$/, "");
    let clave: string;
    try {
      const u = new URL(url);
      clave = u.origin + u.pathname;
    } catch {
      continue;
    }
    if (rutasVistas.has(clave) || vistas.has(url)) continue;
    rutasVistas.add(clave);
    vistas.add(url);
    limpias.push({ url, origen: "html" });
  }
  return limpias;
}

const PARAMS_TAMANO = new Set([
  "w", "h", "width", "height", "q", "quality", "resize", "fit", "crop",
  "dpr", "size", "s", "scale", "zoom", "auto", "format", "fm",
]);
const PARAMS_FIRMA = /^(token|sig|signature|expires?|exp|key|hash|hmac|policy|x-amz-.*)$/i;

/**
 * Variantes de mayor calidad para una URL, ordenadas de mejor a peor.
 * NO incluye la URL original: quien llama la usa como último recurso.
 */
export function variantesMejoradas(original: string): string[] {
  const variantes: string[] = [];
  let url: URL;
  try {
    url = new URL(original);
  } catch {
    return variantes;
  }
  const host = url.hostname;
  const ruta = url.pathname;

  // Proxies de optimización que llevan la URL real dentro (?url=...).
  if (ruta.includes("/_next/image") || host.endsWith("wsrv.nl") || host.endsWith("weserv.nl")) {
    const interna = url.searchParams.get("url");
    if (interna) {
      try {
        // Puede venir absoluta (https://...), relativa (/uploads/foto.jpg,
        // se resuelve contra la página) o sin esquema (host/ruta, weserv).
        const abs = /^https?:/i.test(interna)
          ? new URL(interna).href
          : interna.startsWith("/") && !interna.startsWith("//")
            ? new URL(interna, url.origin).href
            : new URL(`https://${interna.replace(/^\/+/, "")}`).href;
        variantes.push(abs, ...variantesMejoradas(abs));
      } catch {
        // La URL interna no era válida: seguimos con las demás reglas.
      }
    }
  }

  // FC Barcelona: photo-resources es el redimensionador (tope 3000px, y sin
  // query devuelve 400); /fcbarcelona/photo/ sirve el original sin recortar.
  if (host.endsWith("fcbarcelona.com") && ruta.startsWith("/photo-resources/")) {
    const w = parseInt(url.searchParams.get("width") ?? "", 10);
    const h = parseInt(url.searchParams.get("height") ?? "", 10);
    if (w > 0 && w < 3000) {
      const v = new URL(url.href);
      v.searchParams.set("width", "3000");
      if (h > 0) v.searchParams.set("height", String(Math.round((3000 * h) / w)));
      variantes.push(v.href);
    }
    const v = new URL(url.href);
    v.pathname = ruta.replace(
      /^\/photo-resources\/(?:fcbarcelona\/photo\/)?/,
      "/fcbarcelona/photo/",
    );
    v.search = "";
    variantes.push(v.href);
  }

  // YouTube: la miniatura buena tiene nombre propio.
  if (host === "img.youtube.com" || host === "i.ytimg.com") {
    const m = ruta.match(/^\/vi(?:_webp)?\/([^/]+)\//);
    if (m) {
      variantes.push(
        `https://i.ytimg.com/vi/${m[1]}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${m[1]}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`,
      );
    }
  }

  // Twitter/X: name=orig sirve la resolución original.
  if (host === "pbs.twimg.com") {
    const v = new URL(url.href);
    v.searchParams.set("name", "orig");
    variantes.push(v.href);
  }

  // WordPress: miniatura con sufijo -600x400 en el nombre del fichero.
  if (/-\d{2,5}x\d{2,5}\.(jpe?g|png|webp|gif)$/i.test(ruta)) {
    const v = new URL(url.href);
    v.pathname = ruta.replace(/-\d{2,5}x\d{2,5}(\.\w+)$/i, "$1");
    variantes.push(v.href);
  }

  // CDN de wp.com (i0/i1/i2.wp.com): el redimensionado va en la query.
  if (/^i\d\.wp\.com$/.test(host) && url.search) {
    const v = new URL(url.href);
    v.search = "";
    variantes.push(v.href);
  }

  // Cloudinary y Wix: transformaciones (w_600,c_fill...) incrustadas en la ruta.
  if (ruta.includes("/upload/")) {
    const limpia = ruta.replace(/\/upload\/(?:[a-z]+_[^/]+\/)+/i, "/upload/");
    if (limpia !== ruta) {
      const v = new URL(url.href);
      v.pathname = limpia;
      variantes.push(v.href);
    }
  }
  if (host === "static.wixstatic.com") {
    const limpia = ruta.replace(/\/v1\/(?:fill|fit|crop)\/[^/]+\//i, "/");
    if (limpia !== ruta) {
      const v = new URL(url.href);
      v.pathname = limpia;
      variantes.push(v.href);
    }
  }

  // Shopify: sufijos _600x600 / _large / _grande antes de la extensión.
  if (host.endsWith("cdn.shopify.com")) {
    const limpia = ruta.replace(
      /_(?:\d{1,5}x\d{0,5}|pico|icon|thumb|small|compact|medium|large|grande|master)(?=(?:@\dx)?\.\w+$)/i,
      "",
    );
    if (limpia !== ruta) {
      const v = new URL(url.href);
      v.pathname = limpia;
      v.search = "";
      variantes.push(v.href);
    }
  }

  // Googleusercontent/ggpht: el tamaño va como sufijo =s600 / =w600-h400.
  if (host.endsWith("googleusercontent.com") || host.endsWith("ggpht.com")) {
    if (/=[swh]\d/.test(url.href)) {
      variantes.push(url.href.replace(/=[^=]*$/, "=s0"));
    }
  }

  // Squarespace: ?format=1500w → original.
  if (host.endsWith("squarespace-cdn.com") || host.endsWith("squarespace.com")) {
    const v = new URL(url.href);
    if (v.searchParams.has("format")) {
      v.searchParams.set("format", "original");
      variantes.push(v.href);
    }
  }

  // Genérico: si toda la query son parámetros de tamaño (y no hay firma),
  // probar sin ella suele devolver el fichero original.
  if (url.search) {
    const claves = [...url.searchParams.keys()];
    const hayFirma = claves.some((k) => PARAMS_FIRMA.test(k));
    const hayTamano = claves.some((k) => PARAMS_TAMANO.has(k.toLowerCase()));
    if (!hayFirma && hayTamano) {
      const v = new URL(url.href);
      v.search = "";
      variantes.push(v.href);
    }
  }

  // Último recurso: si la URL pide un tamaño concreto (width/height o w/h),
  // pedir 3000px conservando el aspecto. Va tras quitar la query porque
  // algunos CDNs la exigen (fcbarcelona devuelve 400 sin ella) y otros
  // sirven el original directamente al quitarla.
  {
    const claveW = ["width", "w"].find((k) => url.searchParams.has(k));
    const claveH = ["height", "h"].find((k) => url.searchParams.has(k));
    const w = claveW ? parseInt(url.searchParams.get(claveW) ?? "", 10) : NaN;
    if (claveW && w > 0 && w < 3000) {
      const v = new URL(url.href);
      v.searchParams.set(claveW, "3000");
      if (claveH) {
        const h = parseInt(url.searchParams.get(claveH) ?? "", 10);
        if (h > 0) v.searchParams.set(claveH, String(Math.round((3000 * h) / w)));
      }
      variantes.push(v.href);
    }
  }

  // Deduplicar conservando el orden (y sin repetir la original).
  const vistas = new Set<string>([original]);
  return variantes.filter((v) => {
    if (vistas.has(v)) return false;
    vistas.add(v);
    return true;
  });
}
