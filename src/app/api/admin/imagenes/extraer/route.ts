import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { validarUrlPublica } from "@/lib/imagenes/ssrf";
import {
  extraerCandidatas,
  variantesMejoradas,
} from "@/lib/imagenes/extractor";
import { dimensionesDesdeBytes } from "@/lib/imagenes/probe";

export const runtime = "nodejs";
export const maxDuration = 60;

// Nos presentamos como navegador: muchos sitios sirven HTML distinto (o un
// 403) a los user-agents desconocidos.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_HTML = 4 * 1024 * 1024; // 4 MB de HTML es más que de sobra
const MAX_CANDIDATAS = 80;
const CONCURRENCIA = 6;
const RANGO_SONDA = 131071; // 128 KB: cubre las cabeceras de cualquier formato

export type ImagenExtraida = {
  url: string;
  urlOriginal: string | null; // si difiere, la URL de la página era peor
  origen: string;
  mejorada: boolean;
  ancho: number | null;
  alto: number | null;
  bytes: number | null;
  formato: string | null;
};

type Sonda = {
  bytes: number | null;
  formato: string | null;
  ancho: number | null;
  alto: number | null;
};

/** Pide los primeros bytes de la imagen y confirma que existe de verdad. */
async function sondear(url: string, referer: string): Promise<Sonda | null> {
  try {
    await validarUrlPublica(url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        Range: `bytes=0-${RANGO_SONDA}`,
        Referer: referer,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      res.body?.cancel();
      return null;
    }
    const tipo = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (tipo.startsWith("text/html")) {
      res.body?.cancel();
      return null;
    }
    // Tamaño total: del content-range si respetó el Range, si no del length.
    const rango = res.headers.get("content-range")?.match(/\/(\d+)$/);
    const length = res.headers.get("content-length");
    let bytes = rango ? parseInt(rango[1], 10) : length ? parseInt(length, 10) : null;
    if (bytes !== null && Number.isNaN(bytes)) bytes = null;

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0) return null;
    const dims = dimensionesDesdeBytes(buf, tipo);
    // Sin dimensiones reconocibles Y sin content-type de imagen → descartar.
    if (!dims && !tipo.startsWith("image/")) return null;
    if (bytes === null && buf.length <= RANGO_SONDA) bytes = buf.length;
    return {
      bytes,
      formato: dims?.formato ?? (tipo.startsWith("image/") ? tipo.slice(6) : null),
      ancho: dims?.ancho || null,
      alto: dims?.alto || null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  let cruda: unknown;
  try {
    ({ url: cruda } = await request.json());
  } catch {
    cruda = null;
  }
  if (typeof cruda !== "string" || !cruda.trim()) {
    return NextResponse.json({ error: "Falta la URL" }, { status: 400 });
  }
  const conEsquema = /^https?:\/\//i.test(cruda.trim())
    ? cruda.trim()
    : `https://${cruda.trim()}`;

  let url: URL;
  try {
    url = await validarUrlPublica(conEsquema);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL no válida" },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(url.href, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.7",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo descargar la página (¿timeout o bloqueo?)" },
      { status: 502 },
    );
  }
  if (!res.ok) {
    res.body?.cancel();
    return NextResponse.json(
      { error: `La página respondió ${res.status}` },
      { status: 502 },
    );
  }

  const urlFinal = res.url || url.href;
  const tipoPagina = res.headers.get("content-type") ?? "";

  // Si la URL ya era una imagen, no hay nada que extraer: es la candidata.
  if (tipoPagina.startsWith("image/")) {
    res.body?.cancel();
    const sonda = await sondear(urlFinal, urlFinal);
    return NextResponse.json({
      titulo: null,
      urlFinal,
      total: 1,
      descartadas: 0,
      imagenes: [
        {
          url: urlFinal,
          urlOriginal: null,
          origen: "directa",
          mejorada: false,
          ancho: sonda?.ancho ?? null,
          alto: sonda?.alto ?? null,
          bytes: sonda?.bytes ?? null,
          formato: sonda?.formato ?? null,
        } satisfies ImagenExtraida,
      ],
    });
  }

  const html = (await res.text()).slice(0, MAX_HTML);
  const titulo =
    html
      .match(/<title[^>]*>([^<]*)/i)?.[1]
      ?.trim()
      .slice(0, 200) || null;

  const candidatas = extraerCandidatas(html, urlFinal).slice(0, MAX_CANDIDATAS);

  // Para cada candidata: sondear primero las variantes mejoradas (de mejor a
  // peor) y caer a la original si ninguna existe.
  const resultados: (ImagenExtraida | null)[] = new Array(candidatas.length);
  let cursor = 0;
  // Presupuesto global: si la página tiene decenas de imágenes lentas, mejor
  // devolver lo sondeado hasta ahora que estrellarse contra el maxDuration.
  const limite = Date.now() + 45_000;
  async function trabajador() {
    while (cursor < candidatas.length && Date.now() < limite) {
      const i = cursor++;
      const c = candidatas[i];
      let elegida: { url: string; sonda: Sonda } | null = null;
      for (const variante of variantesMejoradas(c.url)) {
        const sonda = await sondear(variante, urlFinal);
        if (sonda) {
          elegida = { url: variante, sonda };
          break;
        }
      }
      if (!elegida) {
        const sonda = await sondear(c.url, urlFinal);
        if (sonda) elegida = { url: c.url, sonda };
      }
      resultados[i] = elegida
        ? {
            url: elegida.url,
            urlOriginal: elegida.url === c.url ? null : c.url,
            origen: c.origen,
            mejorada: elegida.url !== c.url,
            ancho: elegida.sonda.ancho,
            alto: elegida.sonda.alto,
            bytes: elegida.sonda.bytes,
            formato: elegida.sonda.formato,
          }
        : null;
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCIA, candidatas.length) }, trabajador),
  );

  // Deduplicar por URL final (varias miniaturas mejoran a la misma original).
  const vistas = new Set<string>();
  const imagenes: ImagenExtraida[] = [];
  for (const r of resultados) {
    if (!r || vistas.has(r.url)) continue;
    vistas.add(r.url);
    imagenes.push(r);
  }
  imagenes.sort((a, b) => {
    const areaA = (a.ancho ?? 0) * (a.alto ?? 0);
    const areaB = (b.ancho ?? 0) * (b.alto ?? 0);
    if (areaA !== areaB) return areaB - areaA;
    return (b.bytes ?? 0) - (a.bytes ?? 0);
  });

  return NextResponse.json({
    titulo,
    urlFinal,
    total: candidatas.length,
    descartadas: candidatas.length - imagenes.length,
    imagenes,
  });
}
