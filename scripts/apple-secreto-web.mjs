#!/usr/bin/env node
/**
 * Genera la «Secret Key» de Sign in with Apple para la WEB (proveedor Apple
 * de Supabase) con la clave .p8 del Vault (la misma de los avisos, que tiene
 * Sign in with Apple). Apple la deja durar como mucho 6 meses: hay que
 * regenerarla y volver a pegarla en Supabase antes de que caduque, o en la
 * web dejará de funcionar «Continuar con Apple» (en la app no afecta).
 *
 *   node scripts/apple-secreto-web.mjs | pbcopy
 *
 * y pegar en Supabase → Authentication → Sign In / Providers → Apple →
 * Secret Key (for OAuth). La fecha de caducidad sale por stderr.
 */
import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

const SERVICES_ID = "com.soyreinaldo.web";
const DURACION_S = 180 * 86400; // Apple: máximo 15.777.000 s (~6 meses)

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const db = new pg.Client({ connectionString: env.match(/^DATABASE_URL=["']?([^"'\n]+)/m)?.[1] });
await db.connect();
const { rows } = await db.query("select key_id, team_id, p8 from public.push_apns_key()");
await db.end();
const c = rows[0];
if (!c?.p8) throw new Error("No hay clave de Apple en el Vault");

const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const ahora = Math.floor(Date.now() / 1000);
const cab = b64url(JSON.stringify({ alg: "ES256", kid: c.key_id }));
const cuerpo = b64url(
  JSON.stringify({ iss: c.team_id, iat: ahora, exp: ahora + DURACION_S, aud: "https://appleid.apple.com", sub: SERVICES_ID }),
);
const firma = createSign("SHA256").update(`${cab}.${cuerpo}`).sign({ key: createPrivateKey(c.p8), dsaEncoding: "ieee-p1363" });
process.stdout.write(`${cab}.${cuerpo}.${b64url(firma)}`);
console.error(`Caduca el ${new Date((ahora + DURACION_S) * 1000).toLocaleDateString("es-ES")}: regenerar antes.`);
