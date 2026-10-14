import "server-only";
import { createPrivateKey, createSign } from "node:crypto";
import { connect, type ClientHttp2Session } from "node:http2";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushPayload } from "./server";

/**
 * Avisos NATIVOS al iPhone por APNs (app 1.1, 15-oct-2026). Sin librerías:
 * el JWT de Apple es ES256 firmado con la clave .p8 (Vault, migración 065) y
 * el envío es una petición HTTP/2 por dispositivo.
 *
 * Mientras la clave no esté en el Vault, todo esto no hace nada (devuelve 0)
 * y la web sigue igual.
 */

const TOPIC = "com.soyreinaldo.app";
const HOST: Record<Entorno, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

export type Entorno = "production" | "sandbox";
export type DispositivoApns = { token: string; entorno: Entorno };

type Clave = { keyId: string; teamId: string; p8: string };

let clave: Clave | null | undefined;
async function leerClave(supabase: SupabaseClient): Promise<Clave | null> {
  if (clave !== undefined) return clave;
  const { data } = await supabase.rpc("push_apns_key");
  const fila = (data as { key_id: string | null; team_id: string | null; p8: string | null }[] | null)?.[0];
  clave =
    fila?.key_id && fila.team_id && fila.p8
      ? { keyId: fila.key_id, teamId: fila.team_id, p8: fila.p8 }
      : null;
  return clave;
}

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** Apple acepta el mismo JWT hasta una hora; se renueva a los 50 minutos. */
let jwt: { valor: string; t: number } | null = null;
function firmar(c: Clave): string {
  if (jwt && Date.now() - jwt.t < 50 * 60_000) return jwt.valor;
  const cabecera = b64url(JSON.stringify({ alg: "ES256", kid: c.keyId }));
  const cuerpo = b64url(JSON.stringify({ iss: c.teamId, iat: Math.floor(Date.now() / 1000) }));
  const firma = createSign("SHA256")
    .update(`${cabecera}.${cuerpo}`)
    .sign({ key: createPrivateKey(c.p8), dsaEncoding: "ieee-p1363" });
  jwt = { valor: `${cabecera}.${cuerpo}.${b64url(firma)}`, t: Date.now() };
  return jwt.valor;
}

type Respuesta = { status: number; reason: string | null };

function enviarUno(
  sesion: ClientHttp2Session,
  token: string,
  bearer: string,
  cuerpo: string,
  ttl: number,
  tag: string | undefined,
): Promise<Respuesta> {
  return new Promise((resolve) => {
    const req = sesion.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${bearer}`,
      "apns-topic": TOPIC,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + ttl),
      // Mismo tag = el aviso sustituye al anterior (como en la web).
      ...(tag ? { "apns-collapse-id": tag.slice(0, 64) } : {}),
      "content-type": "application/json",
    });
    let status = 0;
    let datos = "";
    req.setTimeout(10_000, () => {
      req.close();
      resolve({ status: 0, reason: "timeout" });
    });
    req.on("response", (h) => {
      status = Number(h[":status"] ?? 0);
    });
    req.on("data", (d) => {
      datos += d;
    });
    req.on("end", () => {
      let reason: string | null = null;
      try {
        reason = datos ? (JSON.parse(datos) as { reason?: string }).reason ?? null : null;
      } catch {
        // cuerpo vacío o no JSON: basta con el status
      }
      resolve({ status, reason });
    });
    req.on("error", () => resolve({ status: 0, reason: "error" }));
    req.end(cuerpo);
  });
}

/**
 * Envía el aviso a una lista de iPhones. Borra los tokens muertos (la app se
 * desinstaló o se quitó el permiso) y corrige el entorno de los que eran de
 * sandbox (compilaciones de Xcode). Devuelve cuántos salieron.
 */
export async function enviarApns(
  supabase: SupabaseClient,
  destinos: DispositivoApns[],
  payload: PushPayload,
  ttl: number,
): Promise<number> {
  if (destinos.length === 0) return 0;
  const c = await leerClave(supabase);
  if (!c) return 0;
  let bearer: string;
  try {
    bearer = firmar(c);
  } catch {
    return 0; // clave mal pegada en el Vault: mejor callar que romper el envío web
  }
  const cuerpo = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      ...(payload.tag ? { "thread-id": payload.tag } : {}),
    },
    // La app abre esta ruta al tocar el aviso.
    url: payload.url,
  });

  const sesiones = new Map<Entorno, ClientHttp2Session>();
  const sesion = (e: Entorno) => {
    let s = sesiones.get(e);
    if (!s || s.closed || s.destroyed) {
      s = connect(HOST[e]);
      s.on("error", () => {});
      sesiones.set(e, s);
    }
    return s;
  };

  let enviados = 0;
  const muertos: string[] = [];
  const aSandbox: string[] = [];
  try {
    await Promise.all(
      destinos.map(async (d) => {
        let r = await enviarUno(sesion(d.entorno), d.token, bearer, cuerpo, ttl, payload.tag);
        // Token de una compilación de Xcode enviado a producción: se reintenta
        // en sandbox y, si va, se apunta.
        if (r.status === 400 && r.reason === "BadDeviceToken" && d.entorno === "production") {
          const r2 = await enviarUno(sesion("sandbox"), d.token, bearer, cuerpo, ttl, payload.tag);
          if (r2.status === 200) aSandbox.push(d.token);
          r = r2;
        }
        if (r.status === 200) enviados++;
        else if (r.status === 410 || r.reason === "BadDeviceToken" || r.reason === "Unregistered") {
          muertos.push(d.token);
        }
      }),
    );
  } finally {
    for (const s of sesiones.values()) s.close();
  }

  if (muertos.length > 0) await supabase.from("push_dispositivos").delete().in("token", muertos);
  if (aSandbox.length > 0) {
    await supabase.from("push_dispositivos").update({ entorno: "sandbox" }).in("token", aSandbox);
  }
  return enviados;
}
