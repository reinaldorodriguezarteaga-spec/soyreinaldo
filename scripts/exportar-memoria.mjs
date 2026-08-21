#!/usr/bin/env node
/**
 * Exporta la memoria del proyecto para llevarla a otro ordenador.
 *
 * La memoria de Claude Code vive fuera del repositorio, en
 * `~/.claude/projects/<ruta-del-proyecto-codificada>/memory/`. El nombre de
 * esa carpeta SE DERIVA DE LA RUTA del proyecto: en este Mac es
 * `-Users-reinaldorodriguez-dev-soyreinaldo`, y en otro ordenador será
 * distinto. Por eso no vale copiar la carpeta entera: hay que copiar los
 * archivos DENTRO de la carpeta que ese otro ordenador genere.
 *
 * Copia solo los .md. Deja fuera `.memsearch_cache.json`, que son 3,6 MB de
 * índice local que se regenera solo y es específico de esta máquina.
 *
 *   node scripts/exportar-memoria.mjs
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const origen = path.join(
  HOME,
  ".claude/projects",
  "-" + process.cwd().replace(/^\//, "").replace(/\//g, "-"),
  "memory",
);
const destino = path.join(HOME, "Documents", "copias-soyreinaldo", "memoria");

if (!fs.existsSync(origen)) {
  console.error(`✘ No encuentro la memoria en ${origen}`);
  process.exit(1);
}

fs.mkdirSync(destino, { recursive: true });

const archivos = fs.readdirSync(origen).filter((f) => f.endsWith(".md"));
let bytes = 0;
for (const f of archivos) {
  const datos = fs.readFileSync(path.join(origen, f));
  fs.writeFileSync(path.join(destino, f), datos);
  bytes += datos.length;
}

// Las instrucciones globales del usuario también viajan.
const global = path.join(HOME, ".claude", "CLAUDE.md");
if (fs.existsSync(global)) {
  fs.copyFileSync(global, path.join(destino, "GLOBAL-CLAUDE.md"));
}

fs.writeFileSync(
  path.join(destino, "LEEME.txt"),
  `Memoria de soyreinaldo.com — exportada el ${new Date().toLocaleString("es-ES")}

CÓMO CARGARLA EN OTRO ORDENADOR

1. En el otro ordenador, abre Claude Code UNA VEZ dentro de la carpeta del
   proyecto (donde hayas clonado soyreinaldo). Con eso se crea sola la carpeta
   de memoria con el nombre que corresponda a esa ruta.

2. Busca esa carpeta:
     macOS / Linux   ~/.claude/projects/<algo-largo>/memory/
     Windows         C:\\Users\\<tu-usuario>\\.claude\\projects\\<algo-largo>\\memory\\
   El <algo-largo> es la ruta del proyecto con las barras cambiadas por
   guiones. No lo inventes: mira cuál se ha creado.

3. Copia dentro TODOS los .md de esta carpeta, MENOS GLOBAL-CLAUDE.md.

4. GLOBAL-CLAUDE.md va en otro sitio: renómbralo a CLAUDE.md y déjalo en
   ~/.claude/CLAUDE.md (son tus instrucciones globales, valen para todos los
   proyectos).

5. Listo. La próxima sesión de Claude Code en ese ordenador ya tendrá el
   contexto.

QUÉ NO SE COPIA
  .memsearch_cache.json — 3,6 MB de índice local, se regenera solo.
`,
);

console.log(`✓ ${archivos.length} archivos de memoria en ${destino}`);
console.log(`  ${Math.round(bytes / 1024)} KB · instrucciones en LEEME.txt`);
console.log(`  Está en Documentos, así que iCloud lo sincroniza solo.`);
