"use client";

import { useMemo, useState } from "react";

type ImagenExtraida = {
  url: string;
  urlOriginal: string | null;
  origen: string;
  mejorada: boolean;
  ancho: number | null;
  alto: number | null;
  bytes: number | null;
  formato: string | null;
};

type Resultado = {
  titulo: string | null;
  urlFinal: string;
  total: number;
  descartadas: number;
  imagenes: ImagenExtraida[];
};

const FILTROS = [
  { etiqueta: "Todas", min: 0 },
  { etiqueta: "≥ 300px", min: 300 },
  { etiqueta: "≥ 800px", min: 800 },
  { etiqueta: "≥ 1200px", min: 1200 },
] as const;

function formatoBytes(n: number | null): string {
  if (n === null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function urlProxy(img: ImagenExtraida, referer: string, inline: boolean): string {
  const p = new URLSearchParams({ u: img.url, r: referer });
  if (inline) p.set("inline", "1");
  return `/api/admin/imagenes/descargar?${p.toString()}`;
}

function Preview({ img, referer }: { img: ImagenExtraida; referer: string }) {
  // Primero intentamos cargar directo del origen (gratis para nosotros); si el
  // sitio bloquea hotlinking caemos al proxy, y si tampoco, placeholder.
  const [fase, setFase] = useState<"directa" | "proxy" | "fallo">("directa");
  if (fase === "fallo") {
    return (
      <div className="flex h-40 items-center justify-center bg-zinc-900 text-xs text-zinc-600">
        sin preview
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- hosts arbitrarios: next/image no aplica
    <img
      src={fase === "directa" ? img.url : urlProxy(img, referer, true)}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-40 w-full bg-zinc-900 object-contain"
      onError={() => setFase(fase === "directa" ? "proxy" : "fallo")}
    />
  );
}

export default function ExtractorImagenes() {
  const [url, setUrl] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datos, setDatos] = useState<Resultado | null>(null);
  const [minPx, setMinPx] = useState<number>(300);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [zipEnCurso, setZipEnCurso] = useState(false);
  const [avisoZip, setAvisoZip] = useState<string | null>(null);

  const visibles = useMemo(() => {
    if (!datos) return [];
    return datos.imagenes.filter((img) => {
      if (minPx === 0) return true;
      // Sin dimensiones conocidas las dejamos pasar: mejor enseñar de más.
      if (img.ancho === null || img.alto === null) return true;
      return Math.max(img.ancho, img.alto) >= minPx;
    });
  }, [datos, minPx]);

  async function extraer(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || cargando) return;
    setCargando(true);
    setError(null);
    setDatos(null);
    setSeleccion(new Set());
    setAvisoZip(null);
    try {
      const res = await fetch("/api/admin/imagenes/extraer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
      } else {
        setDatos(json);
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }

  function alternar(u: string) {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(u)) s.delete(u);
      else s.add(u);
      return s;
    });
  }

  async function descargarZip(urls: string[]) {
    if (!datos || urls.length === 0 || zipEnCurso) return;
    setZipEnCurso(true);
    setAvisoZip(null);
    try {
      const res = await fetch("/api/admin/imagenes/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, referer: datos.urlFinal }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setAvisoZip(json?.error ?? `Error ${res.status} generando el ZIP`);
        return;
      }
      const fallidas = parseInt(res.headers.get("X-Imagenes-Fallidas") ?? "0", 10);
      const blob = await res.blob();
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      try {
        enlace.download = `imagenes-${new URL(datos.urlFinal).hostname}.zip`;
      } catch {
        enlace.download = "imagenes.zip";
      }
      enlace.click();
      URL.revokeObjectURL(enlace.href);
      if (fallidas > 0) {
        setAvisoZip(`${fallidas} imagen(es) no se pudieron incluir en el ZIP.`);
      }
    } catch {
      setAvisoZip("Fallo de red generando el ZIP");
    } finally {
      setZipEnCurso(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={extraer}
        className="mb-8 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://ejemplo.com/articulo-con-fotos"
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={cargando || !url.trim()}
          className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cargando ? "Extrayendo…" : "Extraer imágenes"}
        </button>
      </form>

      {cargando && (
        <p className="text-sm text-zinc-500">
          Descargando la página y sondeando cada imagen (esto tarda unos
          segundos: se comprueban las versiones en alta calidad)…
        </p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {datos && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-zinc-400">
              <span className="font-semibold text-zinc-200">
                {visibles.length}
              </span>{" "}
              imágenes
              {datos.titulo && (
                <span className="text-zinc-500"> · {datos.titulo}</span>
              )}
              {datos.imagenes.some((i) => i.mejorada) && (
                <span className="ml-2 rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                  {datos.imagenes.filter((i) => i.mejorada).length} mejoradas a
                  mayor calidad
                </span>
              )}
            </div>
            <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-xs">
              {FILTROS.map((f) => (
                <button
                  key={f.min}
                  onClick={() => setMinPx(f.min)}
                  className={`rounded-md px-3 py-1.5 transition ${
                    minPx === f.min
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => descargarZip(visibles.map((i) => i.url))}
              disabled={zipEnCurso || visibles.length === 0}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {zipEnCurso ? "Preparando ZIP…" : `Descargar todas (${Math.min(visibles.length, 40)})`}
            </button>
            {seleccion.size > 0 && (
              <button
                onClick={() => descargarZip([...seleccion])}
                disabled={zipEnCurso}
                className="rounded-lg bg-indigo-500/90 px-4 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
              >
                Descargar selección ({seleccion.size})
              </button>
            )}
            {avisoZip && <span className="text-xs text-amber-300">{avisoZip}</span>}
          </div>

          {visibles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
              No hay imágenes con este filtro.
              {datos.descartadas > 0 &&
                ` (${datos.descartadas} candidatas no respondieron a la sonda.)`}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibles.map((img) => (
                <article
                  key={img.url}
                  className={`overflow-hidden rounded-2xl border bg-zinc-950 transition ${
                    seleccion.has(img.url)
                      ? "border-indigo-400"
                      : "border-zinc-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => alternar(img.url)}
                    className="block w-full cursor-pointer"
                    title="Clic para seleccionar"
                  >
                    <Preview img={img} referer={datos.urlFinal} />
                  </button>
                  <div className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-zinc-200">
                        {img.ancho && img.alto
                          ? `${img.ancho}×${img.alto}`
                          : "tamaño desconocido"}
                      </span>
                      <span className="text-zinc-500">
                        {formatoBytes(img.bytes)}
                      </span>
                      {img.formato && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 uppercase text-zinc-400">
                          {img.formato}
                        </span>
                      )}
                      {img.mejorada && (
                        <span
                          className="rounded bg-emerald-400/10 px-1.5 py-0.5 font-medium text-emerald-300"
                          title={`En la página estaba como: ${img.urlOriginal}`}
                        >
                          mejorada
                        </span>
                      )}
                      <span className="text-zinc-600">{img.origen}</span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={urlProxy(img, datos.urlFinal, false)}
                        className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-center text-xs font-medium text-zinc-100 transition hover:bg-zinc-700"
                      >
                        Descargar
                      </a>
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                      >
                        Abrir
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
