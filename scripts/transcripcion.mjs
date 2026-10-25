#!/usr/bin/env node
/**
 * Transcripción de un vídeo de YouTube (25-oct, herramienta «vídeo →
 * artículo», ver .claude/skills/video-a-articulo). Usa yt-dlp (instalado con
 * Homebrew) para bajar SOLO los subtítulos en español —los del autor si los
 * hay, si no los automáticos— y los deja en texto limpio.
 *
 *   node scripts/transcripcion.mjs <url-o-id> [<url-o-id> …] > transcripcion.json
 *
 * Salida: JSON con [{ id, url, titulo, duracion, fecha, texto, palabras }].
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const entradas = process.argv.slice(2);
if (entradas.length === 0) {
  console.error("Uso: node scripts/transcripcion.mjs <url-o-id> [...]");
  process.exit(1);
}

/** VTT de YouTube → texto. Los automáticos repiten cada línea al ir
 * «rodando»: se quitan etiquetas y tiempos y se juntan sin repetir. */
function vttATexto(vtt) {
  const lineas = [];
  for (const bruta of vtt.split("\n")) {
    const l = bruta
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();
    if (!l || l === "WEBVTT" || /^(Kind|Language):/.test(l) || l.includes("-->") || /^\d+$/.test(l)) continue;
    if (lineas[lineas.length - 1] === l) continue;
    lineas.push(l);
  }
  // Solape entre líneas seguidas («hola qué tal» / «qué tal amigos»).
  const out = [];
  for (const l of lineas) {
    const prev = out[out.length - 1];
    if (prev && prev.endsWith(l)) continue;
    if (prev && l.startsWith(prev)) {
      out[out.length - 1] = l;
      continue;
    }
    out.push(l);
  }
  return out.join(" ").replace(/\s+/g, " ").replace(/\[(Música|Aplausos|Risas)\]/gi, "").trim();
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "transcripcion-"));
const resultados = [];
for (const e of entradas) {
  const url = /^[\w-]{11}$/.test(e) ? `https://www.youtube.com/watch?v=${e}` : e;
  const meta = execFileSync(
    "yt-dlp",
    [
      "--skip-download",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      "es-orig,es,es-ES,es-419",
      "--sub-format",
      "vtt",
      "--no-simulate",
      "--print",
      "%(id)s\t%(title)s\t%(duration)s\t%(upload_date)s",
      "-o",
      path.join(dir, "%(id)s.%(ext)s"),
      url,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  )
    .trim()
    .split("\n")
    .pop();
  const [id, titulo, duracion, fecha] = meta.split("\t");
  // Preferencia: subtítulos del autor (es), luego el automático original.
  const vtts = fs.readdirSync(dir).filter((f) => f.startsWith(`${id}.`) && f.endsWith(".vtt"));
  const elegido = ["es.vtt", "es-ES.vtt", "es-419.vtt", "es-orig.vtt"].map((s) => `${id}.${s}`).find((f) => vtts.includes(f)) ?? vtts[0];
  const texto = elegido ? vttATexto(fs.readFileSync(path.join(dir, elegido), "utf8")) : "";
  resultados.push({
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    titulo,
    duracion: Number(duracion) || null,
    fecha: fecha ? `${fecha.slice(0, 4)}-${fecha.slice(4, 6)}-${fecha.slice(6, 8)}` : null,
    texto,
    palabras: texto ? texto.split(/\s+/).length : 0,
  });
}
fs.rmSync(dir, { recursive: true, force: true });
process.stdout.write(JSON.stringify(resultados, null, 2) + "\n");
