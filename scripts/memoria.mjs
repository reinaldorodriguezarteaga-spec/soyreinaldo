#!/usr/bin/env node
/**
 * Sincroniza la memoria de Claude Code con su repositorio privado.
 *
 *   node scripts/memoria.mjs cargar    ← al empezar en una máquina
 *   node scripts/memoria.mjs guardar   ← al terminar
 *
 * Por qué existe: la memoria vive fuera del repositorio del proyecto, en
 * `~/.claude/projects/<ruta-codificada>/memory/`, y ese nombre de carpeta
 * depende de dónde esté el proyecto — o sea que cambia de una máquina a otra.
 * Trabajando desde el Mac y desde la PC, sin esto cada una acumula su propia
 * memoria y acaban contando cosas distintas, que es peor que no tener
 * memoria: te fías de ella.
 *
 * En vez de adivinar cómo codifica la ruta cada sistema, BUSCA la carpeta
 * existente que corresponda a este proyecto. Así funciona igual en macOS,
 * Linux y Windows.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const REPO = path.join(HOME, "dev", "soyreinaldo-memoria");
const PROYECTOS = path.join(HOME, ".claude", "projects");
const GLOBAL = path.join(HOME, ".claude", "CLAUDE.md");

const accion = process.argv[2];
if (!["cargar", "guardar"].includes(accion)) {
  console.error("Uso: node scripts/memoria.mjs cargar | guardar");
  process.exit(1);
}

/**
 * Raíz real del proyecto. Ejecutando desde un worktree, `process.cwd()` sería
 * la carpeta temporal del worktree y no encontraríamos nada: el directorio
 * git común apunta siempre al repositorio principal.
 */
function raizProyecto() {
  try {
    const comun = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
    }).trim();
    return path.dirname(comun);
  } catch {
    return process.cwd();
  }
}

/** La carpeta de memoria de ESTE proyecto en ESTA máquina. */
function encontrarMemoria() {
  if (!fs.existsSync(PROYECTOS)) return null;
  const nombreProyecto = path.basename(raizProyecto()).toLowerCase();
  const candidatos = fs
    .readdirSync(PROYECTOS)
    .filter((d) => fs.existsSync(path.join(PROYECTOS, d, "memory")))
    // El nombre codifica la ruta con guiones: nos vale el que termine en el
    // nombre de la carpeta del proyecto.
    .filter((d) => d.toLowerCase().endsWith(nombreProyecto));

  if (candidatos.length === 0) return null;
  // Si hay varios (el proyecto estuvo en otra ruta antes), el más reciente.
  candidatos.sort(
    (a, b) =>
      fs.statSync(path.join(PROYECTOS, b, "memory")).mtimeMs -
      fs.statSync(path.join(PROYECTOS, a, "memory")).mtimeMs,
  );
  return path.join(PROYECTOS, candidatos[0], "memory");
}

const git = (...a) =>
  execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();

if (!fs.existsSync(REPO)) {
  console.error(`✘ No encuentro el repositorio de memoria en ${REPO}`);
  console.error("  Clónalo primero:");
  console.error(
    "  git clone https://github.com/reinaldorodriguezarteaga-spec/soyreinaldo-memoria " +
      REPO,
  );
  process.exit(1);
}

const memoria = encontrarMemoria();

if (accion === "cargar") {
  try {
    git("pull", "--quiet", "--ff-only");
  } catch {
    console.error("⚠ No se pudo actualizar desde el remoto; uso lo que hay en local.");
  }

  const destino =
    memoria ??
    (() => {
      console.error(
        "✘ No encuentro la carpeta de memoria de este proyecto.\n" +
          "  Abre Claude Code una vez en esta carpeta para que la cree, y repite.",
      );
      process.exit(1);
    })();

  let n = 0;
  for (const f of fs.readdirSync(REPO).filter((f) => f.endsWith(".md"))) {
    if (f === "GLOBAL-CLAUDE.md" || f === "README.md") continue;
    fs.copyFileSync(path.join(REPO, f), path.join(destino, f));
    n++;
  }

  const global = path.join(REPO, "GLOBAL-CLAUDE.md");
  if (fs.existsSync(global)) {
    fs.mkdirSync(path.dirname(GLOBAL), { recursive: true });
    fs.copyFileSync(global, GLOBAL);
  }

  console.log(`✓ ${n} archivos de memoria cargados en ${destino}`);
  console.log(`  Instrucciones globales en ${GLOBAL}`);
} else {
  if (!memoria) {
    console.error("✘ No encuentro la carpeta de memoria de este proyecto.");
    process.exit(1);
  }

  let n = 0;
  for (const f of fs.readdirSync(memoria).filter((f) => f.endsWith(".md"))) {
    fs.copyFileSync(path.join(memoria, f), path.join(REPO, f));
    n++;
  }
  if (fs.existsSync(GLOBAL)) {
    fs.copyFileSync(GLOBAL, path.join(REPO, "GLOBAL-CLAUDE.md"));
  }

  if (!git("status", "--porcelain")) {
    console.log("✓ Sin cambios: la memoria ya estaba guardada.");
    process.exit(0);
  }

  git("add", "-A");
  const sello = new Date().toISOString().slice(0, 16).replace("T", " ");
  git("commit", "--quiet", "-m", `Memoria al ${sello}`);
  try {
    git("push", "--quiet");
    console.log(`✓ ${n} archivos guardados y subidos.`);
  } catch {
    console.log(`✓ ${n} archivos guardados en local. No se pudo subir —`);
    console.log("  hazlo luego con: git -C ~/dev/soyreinaldo-memoria push");
  }
}
