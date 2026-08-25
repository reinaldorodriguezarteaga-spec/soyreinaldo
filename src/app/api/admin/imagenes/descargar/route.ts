import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { validarUrlPublica } from "@/lib/imagenes/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const EXT_POR_TIPO: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

/** Nombre de fichero seguro derivado de la URL (o del parámetro n). */
function nombreFichero(url: URL, tipo: string, pedido: string | null): string {
  let base =
    pedido?.trim() ||
    decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "") ||
    "imagen";
  base = base.replace(/[^\w.\-áéíóúüñÁÉÍÓÚÜÑ ]+/g, "_").slice(0, 120);
  const ext = EXT_POR_TIPO[tipo] ?? "";
  if (ext && !base.toLowerCase().endsWith(ext) && !/\.\w{2,5}$/.test(base)) {
    base += ext;
  }
  return base;
}

// Proxy de descarga: salta el hotlink protection (referer + UA de navegador)
// y fuerza Content-Disposition. Con ?inline=1 sirve la imagen para previews.
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const cruda = params.get("u");
  if (!cruda) {
    return NextResponse.json({ error: "Falta ?u=" }, { status: 400 });
  }

  let url: URL;
  try {
    url = await validarUrlPublica(cruda);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL no válida" },
      { status: 400 },
    );
  }

  const referer = params.get("r") ?? url.origin + "/";
  let res: Response;
  try {
    res = await fetch(url.href, {
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        Referer: referer,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo descargar la imagen" },
      { status: 502 },
    );
  }
  if (!res.ok || !res.body) {
    res.body?.cancel();
    return NextResponse.json(
      { error: `El origen respondió ${res.status}` },
      { status: 502 },
    );
  }

  const tipo =
    res.headers.get("content-type")?.split(";")[0].trim() ??
    "application/octet-stream";
  const inline = params.get("inline") === "1";
  const nombre = nombreFichero(url, tipo, params.get("n"));

  const headers = new Headers({
    "Content-Type": tipo,
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(nombre)}`,
    // Las previews se repiten al re-extraer la misma página: cachear un rato.
    "Cache-Control": inline ? "private, max-age=3600" : "private, no-store",
  });
  const length = res.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(res.body, { status: 200, headers });
}
