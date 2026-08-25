// Lee las dimensiones reales de una imagen a partir de sus primeros bytes
// (una petición con Range basta), sin dependencias. Cubre JPEG, PNG, GIF,
// WebP, AVIF/HEIC y SVG. Si el formato no se reconoce devuelve null: la
// imagen sigue siendo válida, solo que sin resolución conocida.

export type Dimensiones = { ancho: number; alto: number };

function be16(b: Uint8Array, i: number): number {
  return (b[i] << 8) | b[i + 1];
}
function be32(b: Uint8Array, i: number): number {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}
function le16(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8);
}
function le24(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
}
function ascii(b: Uint8Array, i: number, len: number): string {
  return String.fromCharCode(...b.subarray(i, i + len));
}

function dimsJpeg(b: Uint8Array): Dimensiones | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marca = b[i + 1];
    // Marcadores sin longitud (RSTn, otro FF de relleno...).
    if (marca === 0xff) {
      i++;
      continue;
    }
    if (marca === 0xd8 || (marca >= 0xd0 && marca <= 0xd9)) {
      i += 2;
      continue;
    }
    const len = be16(b, i + 2);
    // SOF0..SOF15 menos DHT (C4), JPG (C8) y DAC (CC) llevan las dimensiones.
    if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
      return { alto: be16(b, i + 5), ancho: be16(b, i + 7) };
    }
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

function dimsPng(b: Uint8Array): Dimensiones | null {
  if (b.length < 24 || be32(b, 0) !== 0x89504e47) return null;
  return { ancho: be32(b, 16), alto: be32(b, 20) };
}

function dimsGif(b: Uint8Array): Dimensiones | null {
  if (b.length < 10 || ascii(b, 0, 3) !== "GIF") return null;
  return { ancho: le16(b, 6), alto: le16(b, 8) };
}

function dimsWebp(b: Uint8Array): Dimensiones | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP")
    return null;
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8 ") {
    return { ancho: le16(b, 26) & 0x3fff, alto: le16(b, 28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const ancho = 1 + (((b[22] & 0x3f) << 8) | b[21]);
    const alto = 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6));
    return { ancho, alto };
  }
  if (chunk === "VP8X") {
    return { ancho: 1 + le24(b, 24), alto: 1 + le24(b, 27) };
  }
  return null;
}

// AVIF/HEIC: en vez de recorrer el árbol de cajas ISOBMFF entero, buscamos la
// caja "ispe" (image spatial extents), que lleva ancho/alto en claro.
function dimsAvif(b: Uint8Array): Dimensiones | null {
  if (b.length < 16 || ascii(b, 4, 4) !== "ftyp") return null;
  for (let i = 8; i + 16 < b.length; i++) {
    if (b[i] === 0x69 && b[i + 1] === 0x73 && b[i + 2] === 0x70 && b[i + 3] === 0x65) {
      const ancho = be32(b, i + 8);
      const alto = be32(b, i + 12);
      if (ancho > 0 && alto > 0 && ancho < 65536 && alto < 65536)
        return { ancho, alto };
    }
  }
  return null;
}

function dimsSvg(texto: string): Dimensiones | null {
  const tag = texto.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const num = (attr: string) => {
    const m = tag.match(new RegExp(`${attr}\\s*=\\s*["']?([0-9.]+)`, "i"));
    return m ? Math.round(parseFloat(m[1])) : null;
  };
  const ancho = num("width");
  const alto = num("height");
  if (ancho && alto) return { ancho, alto };
  const vb = tag.match(/viewBox\s*=\s*["']\s*[0-9.-]+[\s,]+[0-9.-]+[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i);
  if (vb) return { ancho: Math.round(parseFloat(vb[1])), alto: Math.round(parseFloat(vb[2])) };
  return null;
}

/** Detecta el formato y saca dimensiones de los primeros bytes descargados. */
export function dimensionesDesdeBytes(
  bytes: Uint8Array,
  contentType?: string | null,
): (Dimensiones & { formato: string }) | null {
  if (bytes.length < 10) return null;
  const intentos: Array<[string, Dimensiones | null]> = [
    ["jpeg", dimsJpeg(bytes)],
    ["png", dimsPng(bytes)],
    ["gif", dimsGif(bytes)],
    ["webp", dimsWebp(bytes)],
    ["avif", dimsAvif(bytes)],
  ];
  for (const [formato, dims] of intentos) {
    if (dims && dims.ancho > 0 && dims.alto > 0) return { ...dims, formato };
  }
  if (contentType?.includes("svg") || bytes[0] === 0x3c) {
    const texto = new TextDecoder("utf-8", { fatal: false }).decode(
      bytes.subarray(0, 4096),
    );
    const dims = dimsSvg(texto);
    if (dims) return { ...dims, formato: "svg" };
    if (/<svg\b/i.test(texto)) return { ancho: 0, alto: 0, formato: "svg" };
  }
  return null;
}
