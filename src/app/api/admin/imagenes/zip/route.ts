import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { validarUrlPublica } from "@/lib/imagenes/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_URLS = 40;
const MAX_POR_IMAGEN = 50 * 1024 * 1024; // 50 MB
const MAX_TOTAL = 120 * 1024 * 1024; // 120 MB en memoria como mucho

// --- ZIP sin dependencias (método store, sin compresión: las imágenes ya
// vienen comprimidas y así el fichero se monta con un simple concat). ---

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) {
    c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

type EntradaZip = { nombre: Uint8Array; datos: Uint8Array; crc: number };

function construirZip(entradas: EntradaZip[]): Uint8Array {
  const ahora = new Date();
  const dosFecha =
    (((ahora.getFullYear() - 1980) & 0x7f) << 9) |
    ((ahora.getMonth() + 1) << 5) |
    ahora.getDate();
  const dosHora =
    (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);

  const trozos: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  let tamCentral = 0;

  for (const e of entradas) {
    const local = new Uint8Array(30 + e.nombre.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // versión mínima
    lv.setUint16(6, 0x0800, true); // flag: nombre en UTF-8
    lv.setUint16(8, 0, true); // método store
    lv.setUint16(10, dosHora, true);
    lv.setUint16(12, dosFecha, true);
    lv.setUint32(14, e.crc, true);
    lv.setUint32(18, e.datos.length, true);
    lv.setUint32(22, e.datos.length, true);
    lv.setUint16(26, e.nombre.length, true);
    local.set(e.nombre, 30);
    trozos.push(local, e.datos);

    const dir = new Uint8Array(46 + e.nombre.length);
    const dv = new DataView(dir.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0x0800, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, dosHora, true);
    dv.setUint16(14, dosFecha, true);
    dv.setUint32(16, e.crc, true);
    dv.setUint32(20, e.datos.length, true);
    dv.setUint32(24, e.datos.length, true);
    dv.setUint16(28, e.nombre.length, true);
    dv.setUint32(42, offset, true);
    dir.set(e.nombre, 46);
    central.push(dir);
    tamCentral += dir.length;
    offset += local.length + e.datos.length;
  }

  const fin = new Uint8Array(22);
  const fv = new DataView(fin.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, entradas.length, true);
  fv.setUint16(10, entradas.length, true);
  fv.setUint32(12, tamCentral, true);
  fv.setUint32(16, offset, true);

  const total = offset + tamCentral + 22;
  const zip = new Uint8Array(total);
  let pos = 0;
  for (const t of [...trozos, ...central, fin]) {
    zip.set(t, pos);
    pos += t.length;
  }
  return zip;
}

function nombreDesdeUrl(u: string, indice: number): string {
  try {
    const base = decodeURIComponent(
      new URL(u).pathname.split("/").filter(Boolean).pop() ?? "",
    );
    const limpio = base.replace(/[^\w.\-áéíóúüñÁÉÍÓÚÜÑ ]+/g, "_").slice(0, 100);
    if (limpio && /\.\w{2,5}$/.test(limpio)) return limpio;
    if (limpio) return `${limpio}.jpg`;
  } catch {
    // caemos al nombre genérico
  }
  return `imagen-${indice + 1}.jpg`;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  let urls: unknown;
  let referer: unknown;
  try {
    ({ urls, referer } = await request.json());
  } catch {
    urls = null;
  }
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "Falta urls[]" }, { status: 400 });
  }
  const lista = urls.filter((u): u is string => typeof u === "string").slice(0, MAX_URLS);
  const ref = typeof referer === "string" ? referer : undefined;

  const entradas: EntradaZip[] = [];
  const nombresUsados = new Set<string>();
  const fallidas: string[] = [];
  let totalBytes = 0;
  const codificador = new TextEncoder();

  for (let i = 0; i < lista.length; i++) {
    const u = lista[i];
    if (totalBytes >= MAX_TOTAL) {
      fallidas.push(u);
      continue;
    }
    try {
      const url = await validarUrlPublica(u);
      const res = await fetch(url.href, {
        headers: {
          "User-Agent": UA,
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          Referer: ref ?? url.origin + "/",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        res.body?.cancel();
        fallidas.push(u);
        continue;
      }
      const length = parseInt(res.headers.get("content-length") ?? "0", 10);
      if (length > MAX_POR_IMAGEN || length + totalBytes > MAX_TOTAL) {
        res.body?.cancel();
        fallidas.push(u);
        continue;
      }
      const datos = new Uint8Array(await res.arrayBuffer());
      if (datos.length === 0 || datos.length > MAX_POR_IMAGEN) {
        fallidas.push(u);
        continue;
      }
      totalBytes += datos.length;

      let nombre = nombreDesdeUrl(u, i);
      if (nombresUsados.has(nombre)) {
        const punto = nombre.lastIndexOf(".");
        nombre = `${nombre.slice(0, punto)}-${i + 1}${nombre.slice(punto)}`;
      }
      nombresUsados.add(nombre);
      entradas.push({
        nombre: codificador.encode(nombre),
        datos,
        crc: crc32(datos),
      });
    } catch {
      fallidas.push(u);
    }
  }

  if (entradas.length === 0) {
    return NextResponse.json(
      { error: "No se pudo descargar ninguna imagen" },
      { status: 502 },
    );
  }

  const zip = construirZip(entradas);
  return new NextResponse(zip.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="imagenes.zip"`,
      "Content-Length": String(zip.length),
      "Cache-Control": "private, no-store",
      // El cliente muestra cuántas se quedaron fuera.
      "X-Imagenes-Fallidas": String(fallidas.length),
    },
  });
}
