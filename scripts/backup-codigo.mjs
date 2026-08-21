#!/usr/bin/env node
/**
 * Copia de seguridad del código, independiente de GitHub.
 *
 * `git bundle` mete el repositorio ENTERO —todas las ramas, todos los commits,
 * toda la historia— en un único archivo. Con ese archivo se reconstruye el
 * proyecto en cualquier ordenador:
 *
 *   git clone soyreinaldo-<fecha>.bundle soyreinaldo
 *
 * Existe porque GitHub ha restringido la cuenta dos veces en tres semanas, y
 * porque desplegamos a producción antes de mergear: hay ratos en que el código
 * que está sirviendo la web solo vive en este Mac.
 *
 *   node scripts/backup-codigo.mjs
 *   node scripts/backup-codigo.mjs --destino ~/Documents/copias-soyreinaldo
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const args = process.argv.slice(2);
const i = args.indexOf("--destino");
const destino = (
  i >= 0 && args[i + 1]
    ? args[i + 1]
    : path.join(os.homedir(), "Documents", "copias-soyreinaldo")
).replace(/^~/, os.homedir());

const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();

try {
  git("rev-parse", "--git-dir");
} catch {
  console.error("✘ Esto no es un repositorio git.");
  process.exit(1);
}

fs.mkdirSync(destino, { recursive: true });
const sello = new Date().toISOString().slice(0, 10);
const fichero = path.join(destino, `soyreinaldo-codigo-${sello}.bundle`);

// --all incluye todas las ramas y etiquetas, no solo la actual: las ramas de
// trabajo sin mergear son justo las que no están en ningún otro sitio.
git("bundle", "create", fichero, "--all");

const mb = (fs.statSync(fichero).size / 1024 / 1024).toFixed(1);
const ramas = git("branch", "--list").split("\n").filter(Boolean).length;
const commits = git("rev-list", "--all", "--count");

console.log(`✓ Código guardado en ${fichero}`);
console.log(`  ${mb} MB · ${ramas} ramas · ${commits} commits`);
console.log(`  Se restaura con: git clone "${fichero}" soyreinaldo`);
