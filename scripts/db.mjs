#!/usr/bin/env node
/**
 * Postgres CLI helper for the Supabase project.
 *
 * Usage:
 *   node scripts/db.mjs file <path-to-.sql>
 *   node scripts/db.mjs query "SELECT 1"
 *
 * Reads DATABASE_URL from .env.local. Connects via pg to the Session Pooler.
 *
 * Output:
 *   - Compact, easy to read in tool output
 *   - Truncates long SELECT results to keep terminals readable
 *   - Exits non-zero on error
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(ENV_PATH)) {
  console.error(`✘ ${ENV_PATH} not found`);
  process.exit(1);
}
const envText = fs.readFileSync(ENV_PATH, "utf8");
const dbUrlMatch = envText.match(/^DATABASE_URL=(.+)$/m);
if (!dbUrlMatch) {
  console.error("✘ DATABASE_URL not set in .env.local");
  process.exit(1);
}
const DATABASE_URL = dbUrlMatch[1].trim();

const [, , mode, ...rest] = process.argv;
if (!mode || !["file", "query"].includes(mode)) {
  console.error(
    "Usage:\n  node scripts/db.mjs file <path>\n  node scripts/db.mjs query \"<sql>\"",
  );
  process.exit(1);
}

let sql;
let label;
if (mode === "file") {
  const filePath = path.resolve(rest[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`✘ File not found: ${filePath}`);
    process.exit(1);
  }
  sql = fs.readFileSync(filePath, "utf8");
  label = path.relative(process.cwd(), filePath);
} else {
  sql = rest.join(" ");
  label = sql.length > 80 ? sql.slice(0, 77) + "..." : sql;
}

const client = new pg.Client({ connectionString: DATABASE_URL });

function formatRows(rows) {
  if (!rows || rows.length === 0) return "(no rows)";
  const cols = Object.keys(rows[0]);
  const widths = cols.map((c) =>
    Math.max(
      c.length,
      ...rows.map((r) => String(r[c] ?? "").length),
    ),
  );
  const sep = "  ";
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(sep);
  const divider = widths.map((w) => "─".repeat(w)).join(sep);
  const body = rows
    .slice(0, 50)
    .map((r) =>
      cols.map((c, i) => String(r[c] ?? "").padEnd(widths[i])).join(sep),
    )
    .join("\n");
  const overflow =
    rows.length > 50 ? `\n... (${rows.length - 50} more rows)` : "";
  return `${header}\n${divider}\n${body}${overflow}`;
}

(async () => {
  try {
    await client.connect();
    console.log(`▸ Running: ${label}`);
    const start = Date.now();
    const result = await client.query(sql);
    const elapsed = Date.now() - start;

    // Multi-statement queries return an array of results
    const results = Array.isArray(result) ? result : [result];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (results.length > 1) {
        console.log(`\n--- Statement ${i + 1} ---`);
      }
      if (r.command && r.rowCount !== null && r.rows.length === 0) {
        console.log(`✓ ${r.command} ${r.rowCount} row(s) affected`);
      } else if (r.rows && r.rows.length > 0) {
        console.log(formatRows(r.rows));
      } else {
        console.log(`✓ ${r.command ?? "OK"}`);
      }
    }

    console.log(`\n⌛ ${elapsed}ms`);
  } catch (err) {
    console.error(`\n✘ Error: ${err.message}`);
    if (err.position) console.error(`  at position ${err.position}`);
    if (err.detail) console.error(`  detail: ${err.detail}`);
    if (err.hint) console.error(`  hint: ${err.hint}`);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
