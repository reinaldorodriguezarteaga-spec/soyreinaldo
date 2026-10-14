/**
 * Avisos nativos desde la web cuando corre dentro de la app (1.1 en
 * adelante). Capacitor inyecta `window.Capacitor` con los plugins de la app
 * que la está mostrando; aquí se usa el de avisos sin añadir dependencias.
 *
 * Si el plugin no está (navegador normal, o la app 1.0, que no lo trae),
 * `pushNativo()` devuelve null y nada de esto aparece.
 */

type Permiso = "granted" | "denied" | "prompt" | "prompt-with-rationale";
type Escucha = { remove: () => Promise<void> };

type PluginAvisos = {
  checkPermissions(): Promise<{ receive: Permiso }>;
  requestPermissions(): Promise<{ receive: Permiso }>;
  register(): Promise<void>;
  addListener(evento: "registration", cb: (t: { value: string }) => void): Promise<Escucha>;
  addListener(evento: "registrationError", cb: (e: { error: string }) => void): Promise<Escucha>;
  addListener(
    evento: "pushNotificationActionPerformed",
    cb: (a: { notification: { data?: { url?: string } } }) => void,
  ): Promise<Escucha>;
};

type CapacitorGlobal = {
  isPluginAvailable?: (nombre: string) => boolean;
  Plugins?: Record<string, unknown>;
};

export function pushNativo(): PluginAvisos | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap?.isPluginAvailable?.("PushNotifications")) return null;
  return (cap.Plugins?.PushNotifications as PluginAvisos | undefined) ?? null;
}

/** Registra el iPhone en APNs y manda su token al servidor. Resuelve con el
 * token (o null si falla). Seguro de llamar varias veces: el servidor hace
 * upsert y el token cambia pocas veces. */
export async function registrarDispositivo(plugin: PluginAvisos): Promise<string | null> {
  const token = await new Promise<string | null>((resolve) => {
    let hecho = false;
    const fin = (v: string | null) => {
      if (hecho) return;
      hecho = true;
      resolve(v);
    };
    void plugin.addListener("registration", (t) => fin(t.value));
    void plugin.addListener("registrationError", () => fin(null));
    plugin.register().catch(() => fin(null));
    setTimeout(() => fin(null), 15_000);
  });
  if (!token) return null;
  const res = await fetch("/api/push/dispositivo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => null);
  return res?.ok ? token : null;
}
