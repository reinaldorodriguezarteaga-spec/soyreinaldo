#!/usr/bin/env node
/**
 * Guarda un análisis como BORRADOR (sin publicar) en `articles` (25-oct,
 * herramienta «vídeo → artículo», ver .claude/skills/video-a-articulo). El
 * dueño lo revisa y lo publica desde /admin/analisis: este script nunca
 * publica.
 *
 *   node scripts/borrador-analisis.mjs <borrador.json>
 *
 * borrador.json: { titulo, extracto, cuerpo (markdown), competicion?,
 *   fixture_id?, team_id?, portada? }. Si `portada` falta y el cuerpo lleva un
 * vídeo de YouTube, se usa su miniatura.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: node scripts/borrador-analisis.mjs <borrador.json>");
  process.exit(1);
}
const b = JSON.parse(fs.readFileSync(path.resolve(archivo), "utf8"));
for (const campo of ["titulo", "extracto", "cuerpo"]) {
  if (typeof b[campo] !== "string" || !b[campo].trim()) {
    console.error(`✘ Falta «${campo}» en ${archivo}`);
    process.exit(1);
  }
}

// Mismo slug que la web (lib/analisis/markdown.ts, aSlug).
const aSlug = (t) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const video = b.cuerpo.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
const portada = b.portada ?? (video ? `https://i.ytimg.com/vi/${video[1]}/maxresdefault.jpg` : null);

const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1].trim();
if (!url) {
  console.error("✘ DATABASE_URL no está en .env.local");
  process.exit(1);
}
const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  // Autor: el mismo de los análisis publicados (el dueño).
  const { rows: autor } = await db.query(
    "select author_id from articles where author_id is not null order by created_at desc limit 1",
  );
  let slug = aSlug(b.titulo);
  for (let n = 2; (await db.query("select 1 from articles where slug = $1", [slug])).rowCount > 0; n++) {
    slug = `${aSlug(b.titulo).slice(0, 66)}-${n}`;
  }
  const { rows } = await db.query(
    `insert into articles (slug, title, excerpt, body, cover_url, competition_slug, fixture_id, team_id, author_id, published_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, null) returning id`,
    [
      slug,
      b.titulo.trim(),
      b.extracto.trim(),
      b.cuerpo.trim(),
      portada,
      b.competicion ?? null,
      b.fixture_id ?? null,
      b.team_id ?? null,
      autor[0]?.author_id ?? null,
    ],
  );
  const palabras = b.cuerpo.trim().split(/\s+/).length;
  console.log(`✓ Borrador guardado (${palabras} palabras): https://www.soyreinaldo.com/admin/analisis?editar=${rows[0].id}`);
} finally {
  await db.end();
}
