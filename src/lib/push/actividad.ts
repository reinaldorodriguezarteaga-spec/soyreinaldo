import "server-only";
import { connect } from "node:http2";
import type { SupabaseClient } from "@supabase/supabase-js";
import { firmar, leerClave } from "./apns";

/**
 * Actividades en directo del iPhone (migración 112, 4-nov-2026): el marcador
 * en la pantalla de bloqueo y en la isla dinámica.
 *
 * - Un canal de APNs por partido (iOS 18+). La ingesta manda una
 *   actualización por cambio y Apple la reparte a todos los suscritos.
 * - Arranque por push (push-to-start) a quien tenga a uno de los equipos en
 *   favoritos con avisos «Todo»; la actividad nace ya escuchando el canal.
 *
 * Los nombres de los campos tienen que coincidir con `PartidoActividad`
 * (Swift), en la app y en el widget.
 */

const APP = "com.soyreinaldo.app";
const GESTION = "https://api-manage-broadcast.push.apple.com:2196";
const ENVIO = "https://api.push.apple.com";
const HOST_DISPOSITIVO = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
} as const;

export type AtributosPartido = {
  partidoId: number;
  local: string;
  visitante: string;
  localId: number;
  visitanteId: number;
};

export type EstadoPartido = {
  gl: number;
  gv: number;
  /** Estado corto de API-Football: 1H, HT, 2H, ET, P, FT… */
  estado: string;
  minuto: number | null;
};

type Respuesta = { status: number; cabeceras: Record<string, string>; cuerpo: string };

function pedir(
  host: string,
  cabeceras: Record<string, string>,
  cuerpo?: string,
): Promise<Respuesta> {
  return new Promise((resolve) => {
    const sesion = connect(host);
    sesion.on("error", () => resolve({ status: 0, cabeceras: {}, cuerpo: "error" }));
    const req = sesion.request(cabeceras);
    let status = 0;
    let recibidas: Record<string, string> = {};
    let datos = "";
    req.setTimeout(10_000, () => {
      req.close();
      sesion.close();
      resolve({ status: 0, cabeceras: {}, cuerpo: "timeout" });
    });
    req.on("response", (h) => {
      status = Number(h[":status"] ?? 0);
      recibidas = Object.fromEntries(Object.entries(h).map(([k, v]) => [k, String(v)]));
    });
    req.on("data", (d) => (datos += d));
    req.on("end", () => {
      sesion.close();
      resolve({ status, cabeceras: recibidas, cuerpo: datos });
    });
    req.on("error", () => {
      sesion.close();
      resolve({ status: 0, cabeceras: {}, cuerpo: "error" });
    });
    req.end(cuerpo);
  });
}

async function bearer(supabase: SupabaseClient): Promise<string | null> {
  const c = await leerClave(supabase);
  if (!c) return null;
  try {
    return firmar(c);
  } catch {
    return null;
  }
}

/** Canal del partido; lo crea si no existe. null si Apple no responde. */
export async function canalDelPartido(
  supabase: SupabaseClient,
  partidoId: number,
): Promise<{ canal: string; nuevo: boolean } | null> {
  const { data: fila } = await supabase
    .from("la_canales")
    .select("canal")
    .eq("partido_id", partidoId)
    .maybeSingle();
  if (fila?.canal) return { canal: fila.canal as string, nuevo: false };

  const b = await bearer(supabase);
  if (!b) return null;
  const r = await pedir(
    GESTION,
    { ":method": "POST", ":path": `/1/apps/${APP}/channels`, authorization: `bearer ${b}` },
    // Sin guardar mensajes: los marcadores cambian a menudo y así Apple da
    // más margen de envíos.
    JSON.stringify({ "message-storage-policy": 0, "push-type": "LiveActivity" }),
  );
  const canal = r.cabeceras["apns-channel-id"];
  if (r.status !== 201 || !canal) return null;

  // Dos peticiones a la vez: gana la primera y la otra borra su canal.
  const { error } = await supabase.from("la_canales").insert({ partido_id: partidoId, canal });
  if (error) {
    await borrarCanal(supabase, canal);
    const { data: otra } = await supabase
      .from("la_canales")
      .select("canal")
      .eq("partido_id", partidoId)
      .maybeSingle();
    return otra?.canal ? { canal: otra.canal as string, nuevo: false } : null;
  }
  return { canal, nuevo: true };
}

async function borrarCanal(supabase: SupabaseClient, canal: string) {
  const b = await bearer(supabase);
  if (!b) return;
  await pedir(GESTION, {
    ":method": "DELETE",
    ":path": `/1/apps/${APP}/channels`,
    authorization: `bearer ${b}`,
    "apns-channel-id": canal,
  });
}

/**
 * Manda el estado a todos los iPhones del canal. `fin` cierra la actividad
 * (se queda el resultado un rato en la pantalla de bloqueo) y borra el canal.
 */
export async function difundir(
  supabase: SupabaseClient,
  canal: string,
  estado: EstadoPartido,
  opciones: { urgente: boolean; fin?: boolean },
): Promise<boolean> {
  const b = await bearer(supabase);
  if (!b) return false;
  const ahora = Math.floor(Date.now() / 1000);
  const r = await pedir(
    ENVIO,
    {
      ":method": "POST",
      ":path": `/4/broadcasts/apps/${APP}`,
      authorization: `bearer ${b}`,
      "apns-channel-id": canal,
      "apns-push-type": "liveactivity",
      "apns-priority": opciones.urgente ? "10" : "5",
      // Canal sin almacenamiento: Apple exige una caducidad distinta de 0.
      "apns-expiration": String(ahora + 120),
    },
    JSON.stringify({
      aps: {
        timestamp: ahora,
        event: opciones.fin ? "end" : "update",
        "content-state": estado,
        // Sin noticias en 15 min (ingesta caída): iOS la marca como pasada.
        "stale-date": ahora + 15 * 60,
        ...(opciones.fin ? { "dismissal-date": ahora + 2 * 3600 } : {}),
      },
    }),
  );
  if (opciones.fin) {
    await borrarCanal(supabase, canal);
    await supabase.from("la_canales").delete().eq("canal", canal);
  }
  return r.status === 200;
}

/**
 * Enciende la actividad en los iPhones de quien sigue a alguno de los dos
 * equipos con avisos «Todo». Nace escuchando el canal del partido.
 */
export async function arrancarActividades(
  supabase: SupabaseClient,
  canal: string,
  atributos: AtributosPartido,
  estado: EstadoPartido,
): Promise<number> {
  const { data } = await supabase.rpc("la_targets_inicio", {
    p_home: String(atributos.localId),
    p_away: String(atributos.visitanteId),
  });
  const destinos = (data ?? []) as { token: string; entorno: "production" | "sandbox" }[];
  if (destinos.length === 0) return 0;
  const b = await bearer(supabase);
  if (!b) return 0;
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = JSON.stringify({
    aps: {
      timestamp: ahora,
      event: "start",
      "content-state": estado,
      "attributes-type": "PartidoActividad",
      attributes: atributos,
      "input-push-channel": canal,
      "stale-date": ahora + 15 * 60,
      alert: {
        title: `🟢 ${atributos.local} – ${atributos.visitante}`,
        body: "Sigue el marcador en directo desde aquí",
      },
    },
  });
  let enviados = 0;
  const muertos: string[] = [];
  await Promise.all(
    destinos.map(async (d) => {
      const r = await pedir(
        HOST_DISPOSITIVO[d.entorno],
        {
          ":method": "POST",
          ":path": `/3/device/${d.token}`,
          authorization: `bearer ${b}`,
          "apns-topic": `${APP}.push-type.liveactivity`,
          "apns-push-type": "liveactivity",
          "apns-priority": "10",
          "apns-expiration": String(ahora + 600),
        },
        cuerpo,
      );
      if (r.status === 200) enviados++;
      else if (r.status === 410 || /BadDeviceToken|Unregistered/.test(r.cuerpo)) muertos.push(d.token);
    }),
  );
  if (muertos.length > 0) await supabase.from("la_tokens_inicio").delete().in("token", muertos);
  return enviados;
}
