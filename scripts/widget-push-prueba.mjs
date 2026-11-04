#!/usr/bin/env node
/**
 * Pide a todos los iPhones con el widget del marcador (iOS 26+) que lo
 * recarguen ya, como hace la ingesta en vivo en cada gol (lib/push/apns.ts,
 * refrescarWidgets). Para probarlo sin esperar a un partido.
 *
 *   node scripts/widget-push-prueba.mjs
 *
 * Lee DATABASE_URL de .env.local, como scripts/db.mjs.
 */
import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { connect } from "node:http2";
import pg from "pg";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const db = new pg.Client({ connectionString: env.match(/^DATABASE_URL=["']?([^"'\n]+)/m)?.[1] });
await db.connect();
const { rows: claves } = await db.query("select key_id, team_id, p8 from public.push_apns_key()");
const { rows: dispositivos } = await db.query("select token, entorno from widget_push_tokens");
await db.end();

const c = claves[0];
if (!c?.p8) throw new Error("No hay clave APNs en el Vault");
if (dispositivos.length === 0) {
  console.error("No hay ningún widget registrado (hace falta la app nueva, iOS 26+ y el widget puesto).");
  process.exit(1);
}

const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const cab = b64url(JSON.stringify({ alg: "ES256", kid: c.key_id }));
const cuerpo = b64url(JSON.stringify({ iss: c.team_id, iat: Math.floor(Date.now() / 1000) }));
const firma = createSign("SHA256").update(`${cab}.${cuerpo}`).sign({ key: createPrivateKey(c.p8), dsaEncoding: "ieee-p1363" });
const jwt = `${cab}.${cuerpo}.${b64url(firma)}`;

const payload = JSON.stringify({ aps: { "content-changed": true } });
for (const d of dispositivos) {
  const host = d.entorno === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const sesion = connect(host);
  const res = await new Promise((resolve) => {
    const req = sesion.request({
      ":method": "POST",
      ":path": `/3/device/${d.token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": "com.soyreinaldo.app.push-type.widgets",
      "apns-push-type": "widgets",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let datos = "";
    req.on("response", (h) => (status = Number(h[":status"])));
    req.on("data", (x) => (datos += x));
    req.on("end", () => resolve({ status, datos }));
    req.on("error", (e) => resolve({ status: 0, datos: String(e) }));
    req.end(payload);
  });
  sesion.close();
  console.log(`${d.entorno} ${d.token.slice(0, 8)}… → ${res.status} ${res.datos}`);
}
