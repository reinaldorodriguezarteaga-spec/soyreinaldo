#!/usr/bin/env node
/**
 * Manda un aviso de prueba a los iPhones de un usuario (app 1.1), por APNs,
 * igual que lib/push/apns.ts pero desde la terminal: para comprobar que la
 * clave del Vault y los tokens funcionan sin esperar a un gol.
 *
 *   node scripts/push-prueba.mjs <username> ["título"] ["texto"]
 *
 * Lee DATABASE_URL de .env.local, como scripts/db.mjs.
 */
import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { connect } from "node:http2";
import pg from "pg";

const [usuario, titulo = "⚽ Prueba de avisos", texto = "Si ves esto, los avisos de la app funcionan."] =
  process.argv.slice(2);
if (!usuario) {
  console.error('Uso: node scripts/push-prueba.mjs <username> ["título"] ["texto"]');
  process.exit(1);
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const db = new pg.Client({ connectionString: env.match(/^DATABASE_URL=["']?([^"'\n]+)/m)?.[1] });
await db.connect();
const { rows: claves } = await db.query("select key_id, team_id, p8 from public.push_apns_key()");
const { rows: dispositivos } = await db.query(
  `select d.token, d.entorno from push_dispositivos d join profiles p on p.id = d.user_id where p.username = $1`,
  [usuario],
);
await db.end();

const c = claves[0];
if (!c?.p8) throw new Error("No hay clave APNs en el Vault");
if (dispositivos.length === 0) {
  console.error(`«${usuario}» no tiene ningún iPhone registrado (¿activó los avisos en la app 1.1?).`);
  process.exit(1);
}

const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const cab = b64url(JSON.stringify({ alg: "ES256", kid: c.key_id }));
const cuerpo = b64url(JSON.stringify({ iss: c.team_id, iat: Math.floor(Date.now() / 1000) }));
const firma = createSign("SHA256").update(`${cab}.${cuerpo}`).sign({ key: createPrivateKey(c.p8), dsaEncoding: "ieee-p1363" });
const jwt = `${cab}.${cuerpo}.${b64url(firma)}`;

const payload = JSON.stringify({ aps: { alert: { title: titulo, body: texto }, sound: "default" }, url: "/perfil" });
for (const d of dispositivos) {
  const host = d.entorno === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const sesion = connect(host);
  const res = await new Promise((resolve) => {
    const req = sesion.request({
      ":method": "POST",
      ":path": `/3/device/${d.token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": "com.soyreinaldo.app",
      "apns-push-type": "alert",
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
